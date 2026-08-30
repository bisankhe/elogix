# ============================================================
#  eLogix HRMS — Attendance Log Router
#  Daily Attendance Log In / Log Out + Overtime Log
#  Nepal Labour Act 2074 compliant
# ============================================================
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, extract
from typing import Optional, List
from datetime import date, datetime
from app.database import get_db
from app.models.attendance_log import AttendanceLog, OvertimeLog
from app.core.deps import get_current_user

router = APIRouter()

# ── ATTENDANCE LOG ────────────────────────────────────────────

@router.get("/daily")
def get_daily_attendance(
    log_date:   date        = Query(default=None),
    dept:       Optional[str] = Query(default=None),
    shift:      Optional[str] = Query(default=None),
    emp_id:     Optional[str] = Query(default=None),
    search:     Optional[str] = Query(default=None),
    page:       int         = Query(default=1, ge=1),
    per_page:   int         = Query(default=50, le=200),
    db: Session = Depends(get_db),
    current = Depends(get_current_user)
):
    """Get daily attendance logs — filterable by date/dept/shift/employee."""
    q = db.query(AttendanceLog)
    if log_date:
        q = q.filter(AttendanceLog.log_date == log_date)
    else:
        q = q.filter(AttendanceLog.log_date == date.today())
    if dept and dept != 'All Staffs':
        q = q.filter(AttendanceLog.department == dept)
    if shift and shift != 'All':
        q = q.filter(AttendanceLog.shift == shift)
    if emp_id:
        q = q.filter(AttendanceLog.emp_id.ilike(f"%{emp_id}%"))
    if search:
        q = q.filter(
            AttendanceLog.emp_name.ilike(f"%{search}%") |
            AttendanceLog.emp_id.ilike(f"%{search}%")
        )

    total = q.count()
    records = q.order_by(AttendanceLog.sl_no).offset((page-1)*per_page).limit(per_page).all()

    # Summary stats
    all_today = db.query(AttendanceLog).filter(AttendanceLog.log_date == (log_date or date.today()))
    present = all_today.filter(AttendanceLog.is_present == True).count()
    absent  = all_today.filter(AttendanceLog.is_present == False).count()
    late    = all_today.filter(and_(AttendanceLog.is_present == True, AttendanceLog.is_late == True)).count()
    avg_net = db.query(func.avg(AttendanceLog.net_hrs_worked)).filter(
        AttendanceLog.log_date == (log_date or date.today()),
        AttendanceLog.is_present == True
    ).scalar() or 0

    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "records": [r.__dict__ for r in records],
        "summary": {
            "total_staff": total,
            "present": present,
            "absent": absent,
            "late_arrivals": late,
            "avg_net_hrs": round(float(avg_net), 2)
        }
    }

@router.post("/daily")
def create_attendance_log(data: dict, db: Session = Depends(get_db), current = Depends(get_current_user)):
    """Add a single attendance log entry."""
    # Auto-calculate totals
    def calc_hrs(login, logout):
        if not login or not logout:
            return 0.0
        try:
            lh, lm = map(int, login.split(':'))
            oh, om = map(int, logout.split(':'))
            return max(0, ((oh * 60 + om) - (lh * 60 + lm)) / 60)
        except:
            return 0.0

    t1 = calc_hrs(data.get('login1'), data.get('logout1'))
    t2 = calc_hrs(data.get('login2'), data.get('logout2'))
    hrs_worked = t1 + t2
    t3 = calc_hrs(data.get('lunch_in'), data.get('lunch_out'))
    t4 = calc_hrs(data.get('break_in1'), data.get('break_out1'))
    t5 = calc_hrs(data.get('break_in2'), data.get('break_out2'))
    total_breaks = t3 + t4 + t5
    net_hrs = max(0, hrs_worked - total_breaks)

    log = AttendanceLog(
        log_date       = data.get('log_date', date.today()),
        emp_id         = data['emp_id'],
        emp_name       = data['emp_name'],
        department     = data.get('department'),
        shift          = data.get('shift', 'Day'),
        emp_status     = data.get('emp_status', 'Permanent'),
        login1         = data.get('login1'),
        logout1        = data.get('logout1'),
        session1_hrs   = round(t1, 2),
        login2         = data.get('login2'),
        logout2        = data.get('logout2'),
        session2_hrs   = round(t2, 2),
        hrs_worked     = round(hrs_worked, 2),
        lunch_in       = data.get('lunch_in'),
        lunch_out      = data.get('lunch_out'),
        lunch_hrs      = round(t3, 2),
        break_in1      = data.get('break_in1'),
        break_out1     = data.get('break_out1'),
        break1_hrs     = round(t4, 2),
        break_in2      = data.get('break_in2'),
        break_out2     = data.get('break_out2'),
        break2_hrs     = round(t5, 2),
        total_breaks   = round(total_breaks, 2),
        net_hrs_worked = round(net_hrs, 2),
        is_present     = True,
        is_late        = (data.get('login1', '') >= '09:00') if data.get('login1') else False,
        created_by     = current.id
    )
    db.add(log); db.commit(); db.refresh(log)
    return {"id": log.id, "message": "Attendance log created", "net_hrs": log.net_hrs_worked}

@router.put("/daily/{log_id}")
def update_attendance_log(log_id: int, data: dict, db: Session = Depends(get_db), current = Depends(get_current_user)):
    """Update an attendance log entry and recalculate totals."""
    log = db.query(AttendanceLog).filter(AttendanceLog.id == log_id).first()
    if not log:
        raise HTTPException(404, "Log entry not found")
    for k, v in data.items():
        if hasattr(log, k):
            setattr(log, k, v)
    db.commit()
    return {"message": "Updated", "id": log_id}

@router.delete("/daily/{log_id}")
def delete_attendance_log(log_id: int, db: Session = Depends(get_db), current = Depends(get_current_user)):
    log = db.query(AttendanceLog).filter(AttendanceLog.id == log_id).first()
    if not log:
        raise HTTPException(404, "Not found")
    db.delete(log); db.commit()
    return {"message": "Deleted"}

@router.get("/daily/export/csv")
def export_attendance_csv(
    log_date: date = Query(default=None),
    dept:     Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    current = Depends(get_current_user)
):
    """Return attendance data formatted for CSV export."""
    q = db.query(AttendanceLog)
    if log_date:
        q = q.filter(AttendanceLog.log_date == log_date)
    if dept and dept != 'All Staffs':
        q = q.filter(AttendanceLog.department == dept)
    records = q.order_by(AttendanceLog.sl_no).all()
    return {"records": [r.__dict__ for r in records], "count": len(records)}


# ── OVERTIME LOG ──────────────────────────────────────────────

@router.get("/overtime")
def get_overtime_logs(
    date_from:    Optional[date]  = Query(default=None),
    date_to:      Optional[date]  = Query(default=None),
    dept:         Optional[str]   = Query(default=None),
    shift:        Optional[str]   = Query(default=None),
    ot_type:      Optional[str]   = Query(default=None),
    status:       Optional[str]   = Query(default=None),
    search:       Optional[str]   = Query(default=None),
    period:       str             = Query(default='daily'),
    page:         int             = Query(default=1, ge=1),
    per_page:     int             = Query(default=50, le=200),
    db: Session = Depends(get_db),
    current = Depends(get_current_user)
):
    """Get overtime logs with full filtering and pagination."""
    q = db.query(OvertimeLog)
    if date_from:
        q = q.filter(OvertimeLog.ot_date >= date_from)
    if date_to:
        q = q.filter(OvertimeLog.ot_date <= date_to)
    if dept and dept != 'All Staffs':
        q = q.filter(OvertimeLog.department == dept)
    if shift and shift != 'All':
        q = q.filter(OvertimeLog.shift == shift)
    if ot_type and ot_type != 'All':
        q = q.filter(OvertimeLog.ot_type == ot_type)
    if status and status != 'All':
        q = q.filter(OvertimeLog.status == status)
    if search:
        q = q.filter(
            OvertimeLog.emp_name.ilike(f"%{search}%") |
            OvertimeLog.emp_id.ilike(f"%{search}%")
        )

    total = q.count()
    records = q.order_by(OvertimeLog.id.desc()).offset((page-1)*per_page).limit(per_page).all()

    total_ot_hrs = db.query(func.sum(OvertimeLog.ot_hrs)).scalar() or 0
    total_ot_pay = db.query(func.sum(OvertimeLog.ot_pay)).scalar() or 0
    pending_count = db.query(OvertimeLog).filter(OvertimeLog.status == 'pending').count()
    approved_count = db.query(OvertimeLog).filter(OvertimeLog.status == 'approved').count()

    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "records": [r.__dict__ for r in records],
        "summary": {
            "total_ot_hrs": round(float(total_ot_hrs), 2),
            "total_ot_pay": int(total_ot_pay),
            "pending": pending_count,
            "approved": approved_count
        }
    }

@router.post("/overtime")
def create_ot_log(data: dict, db: Session = Depends(get_db), current = Depends(get_current_user)):
    """Create overtime log entry with auto-calculated pay."""
    def calc_hrs(start, end):
        if not start or not end:
            return 0.0
        try:
            sh, sm = map(int, start.split(':'))
            eh, em = map(int, end.split(':'))
            return max(0, ((eh * 60 + em) - (sh * 60 + sm)) / 60)
        except:
            return 0.0

    base_salary = float(data.get('base_salary', 30000))
    hourly_rate = round(base_salary / 22 / 8)
    ot_hrs      = calc_hrs(data.get('ot_start'), data.get('ot_end'))
    rate_map    = {'1.0×': 1.0, '1.5×': 1.5, '2.0×': 2.0, '2.5×': 2.5, '3.0×': 3.0}
    multiplier  = rate_map.get(data.get('ot_rate', '1.5×'), 1.5)
    ot_pay      = round(ot_hrs * hourly_rate * multiplier)

    # Regular hrs
    def calc_reg(l1, o1, l2, o2):
        t1 = calc_hrs(l1, o1)
        t2 = calc_hrs(l2, o2)
        return round(t1 + t2, 2)

    reg_hrs = calc_reg(data.get('login1'), data.get('logout1'), data.get('login2'), data.get('logout2'))

    ot = OvertimeLog(
        ot_date        = data.get('ot_date', date.today()),
        emp_id         = data['emp_id'],
        emp_name       = data['emp_name'],
        department     = data.get('department'),
        shift          = data.get('shift', 'Day'),
        login1         = data.get('login1'),
        logout1        = data.get('logout1'),
        login2         = data.get('login2'),
        logout2        = data.get('logout2'),
        regular_hrs    = reg_hrs,
        ot_start       = data.get('ot_start'),
        ot_end         = data.get('ot_end'),
        ot_hrs         = round(ot_hrs, 2),
        ot_type        = data.get('ot_type', 'Weekday OT'),
        ot_rate        = data.get('ot_rate', '1.5×'),
        hourly_rate    = hourly_rate,
        ot_pay         = ot_pay,
        total_pay      = ot_pay,
        base_salary    = base_salary,
        remarks        = data.get('remarks', ''),
        status         = 'pending',
        created_by     = current.id
    )
    db.add(ot); db.commit(); db.refresh(ot)
    return {"id": ot.id, "ot_hrs": ot.ot_hrs, "ot_pay": ot.ot_pay, "message": "OT entry created"}

@router.put("/overtime/{ot_id}/process")
def process_ot(ot_id: int, data: dict, db: Session = Depends(get_db), current = Depends(get_current_user)):
    """Process OT — Supervisor/Manager/HOD action."""
    ot = db.query(OvertimeLog).filter(OvertimeLog.id == ot_id).first()
    if not ot:
        raise HTTPException(404, "Not found")
    if ot.status != 'pending':
        raise HTTPException(400, f"Cannot process: current status is '{ot.status}'")
    ot.status       = 'processing'
    ot.processed_by = data.get('processed_by', current.full_name)
    ot.processed_at = datetime.utcnow()
    db.commit()
    return {"message": "Sent for approval", "status": "processing"}

@router.put("/overtime/{ot_id}/approve")
def approve_ot(ot_id: int, data: dict, db: Session = Depends(get_db), current = Depends(get_current_user)):
    """Approve OT — HOD/Payroll Officer/HR Manager action."""
    ot = db.query(OvertimeLog).filter(OvertimeLog.id == ot_id).first()
    if not ot:
        raise HTTPException(404, "Not found")
    if ot.status not in ('processing', 'pending'):
        raise HTTPException(400, f"Cannot approve: status is '{ot.status}'")
    action = data.get('action', 'approved')
    ot.status      = action
    ot.approved_by = data.get('approved_by', current.full_name)
    ot.remarks     = data.get('remarks', ot.remarks)
    ot.approved_at = datetime.utcnow()
    db.commit()
    return {"message": f"OT {action}", "status": action}

@router.post("/overtime/bulk-process")
def bulk_process_ot(data: dict, db: Session = Depends(get_db), current = Depends(get_current_user)):
    """Bulk process multiple OT entries."""
    ids = data.get('ids', [])
    processor = data.get('processed_by', current.full_name)
    updated = db.query(OvertimeLog).filter(
        OvertimeLog.id.in_(ids),
        OvertimeLog.status == 'pending'
    ).update({'status': 'processing', 'processed_by': processor, 'processed_at': datetime.utcnow()}, synchronize_session=False)
    db.commit()
    return {"message": f"{updated} OT records sent for approval"}

@router.post("/overtime/bulk-approve")
def bulk_approve_ot(data: dict, db: Session = Depends(get_db), current = Depends(get_current_user)):
    """Bulk approve multiple OT entries."""
    ids = data.get('ids', [])
    action    = data.get('action', 'approved')
    approver  = data.get('approved_by', current.full_name)
    updated = db.query(OvertimeLog).filter(
        OvertimeLog.id.in_(ids),
        OvertimeLog.status.in_(['pending', 'processing'])
    ).update({'status': action, 'approved_by': approver, 'approved_at': datetime.utcnow()}, synchronize_session=False)
    db.commit()
    return {"message": f"{updated} OT records {action}"}

@router.get("/overtime/summary")
def ot_summary(
    period: str = Query(default='monthly'),
    dept:   Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    current = Depends(get_current_user)
):
    """OT summary statistics for dashboard cards."""
    q = db.query(OvertimeLog)
    if dept and dept != 'All Staffs':
        q = q.filter(OvertimeLog.department == dept)
    today = date.today()
    if period == 'daily':
        q = q.filter(OvertimeLog.ot_date == today)
    elif period == 'weekly':
        from datetime import timedelta
        q = q.filter(OvertimeLog.ot_date >= today - timedelta(days=7))
    elif period == 'monthly':
        q = q.filter(extract('month', OvertimeLog.ot_date) == today.month,
                     extract('year',  OvertimeLog.ot_date) == today.year)

    records = q.all()
    return {
        "period": period,
        "total_entries": len(records),
        "total_ot_hrs": round(sum(r.ot_hrs or 0 for r in records), 2),
        "total_ot_pay": sum(r.ot_pay or 0 for r in records),
        "by_status": {
            "pending":    sum(1 for r in records if r.status == 'pending'),
            "processing": sum(1 for r in records if r.status == 'processing'),
            "approved":   sum(1 for r in records if r.status == 'approved'),
            "paid":       sum(1 for r in records if r.status == 'paid'),
            "rejected":   sum(1 for r in records if r.status == 'rejected'),
        },
        "by_type": {
            ot_type: sum(r.ot_hrs or 0 for r in records if r.ot_type == ot_type)
            for ot_type in set(r.ot_type for r in records if r.ot_type)
        }
    }


# ── NIGHT DUTY ALLOWANCE ──────────────────────────────────────
@router.get("/night-duty")
def get_night_duty(
    date_from:  Optional[date] = Query(default=None),
    date_to:    Optional[date] = Query(default=None),
    dept:       Optional[str]  = Query(default=None),
    status:     Optional[str]  = Query(default=None),
    search:     Optional[str]  = Query(default=None),
    period:     str            = Query(default='monthly'),
    db: Session = Depends(get_db),
    current = Depends(get_current_user)
):
    """Get all night duty allowance records — cumulative by payroll period."""
    q = db.query(OvertimeLog).filter(
        OvertimeLog.ot_type.in_(['Night OT']) |
        (OvertimeLog.shift == 'Night')
    ).union(
        db.query(AttendanceLog).filter(AttendanceLog.shift == 'Night')
    )
    # Simplified: fetch from OT log where night flag is set
    q2 = db.query(OvertimeLog).filter(OvertimeLog.shift == 'Night')
    if date_from: q2 = q2.filter(OvertimeLog.ot_date >= date_from)
    if date_to:   q2 = q2.filter(OvertimeLog.ot_date <= date_to)
    if dept and dept != 'All Staffs': q2 = q2.filter(OvertimeLog.department == dept)
    if status and status != 'All':    q2 = q2.filter(OvertimeLog.status == status)
    if search:
        q2 = q2.filter(OvertimeLog.emp_name.ilike(f"%{search}%") | OvertimeLog.emp_id.ilike(f"%{search}%"))
    records = q2.all()

    # Cumulative by employee by payroll_period
    cumulative = {}
    for r in records:
        key = (r.emp_id, r.payroll_period)
        if key not in cumulative:
            cumulative[key] = {'emp_id': r.emp_id, 'emp_name': r.emp_name, 'dept': r.department,
                               'period': r.payroll_period, 'nights': 0, 'total_ot_hrs': 0, 'total_pay': 0}
        cumulative[key]['nights'] += 1
        cumulative[key]['total_ot_hrs'] += float(r.ot_hrs or 0)
        cumulative[key]['total_pay'] += int(r.ot_pay or 0)

    return {
        "records": [r.__dict__ for r in records],
        "cumulative": list(cumulative.values()),
        "summary": {
            "total_nights": sum(v['nights'] for v in cumulative.values()),
            "total_allowance": sum(v['total_pay'] for v in cumulative.values()),
            "employees_on_night": len(cumulative)
        }
    }

@router.post("/night-duty/send-payroll")
def send_night_duty_to_payroll(data: dict, db: Session = Depends(get_db), current = Depends(get_current_user)):
    """Batch-send approved night duty records to payroll processing queue."""
    period = data.get('payroll_period')
    dept   = data.get('dept')
    q = db.query(OvertimeLog).filter(
        OvertimeLog.shift == 'Night',
        OvertimeLog.status == 'approved',
        OvertimeLog.payroll_synced == False
    )
    if period: q = q.filter(OvertimeLog.payroll_period == period)
    if dept and dept != 'All Staffs': q = q.filter(OvertimeLog.department == dept)
    records = q.all()
    count = 0
    for r in records:
        r.payroll_synced = True
        r.payroll_ref = f"ND-{r.payroll_period}-{str(r.id).zfill(4)}"
        r.status = 'paid'
        count += 1
    db.commit()
    return {"message": f"{count} night duty records sent to payroll", "period": period}
