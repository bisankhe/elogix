"""Running payroll.

`compute.py` does the arithmetic on plain values; this assembles those values from the
rest of the system and writes the result back. The assembly is where a payroll engine
usually goes wrong, so the sources are explicit:

* **payable days and overtime** come from the attendance export, not from a guess;
* **the salary** is the row effective *in the period being paid*, not the current one;
* **the tax scale** is the company's own rows, snapshotted onto each payslip.

Approving a run locks the attendance days behind it. After that a recompute of that month
skips those days, so nothing can silently change a figure someone was already paid on.
"""

import uuid
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from elogix_api.modules.attendance.models import AttendanceDay, DayStatus
from elogix_api.modules.employee.models import Employee, EmployeeStatus
from elogix_api.modules.payroll import compute
from elogix_api.modules.payroll.models import (
    ComponentKind,
    EmployeeSalary,
    EmployeeSalaryLine,
    PayrollRun,
    Payslip,
    PayslipLine,
    PayslipTaxBand,
    RunStatus,
    SalaryComponent,
    TaxScale,
    TaxSlab,
)
from elogix_api.nepal import tax as statutory

ZERO = Decimal("0")
_ONE_DAY = timedelta(days=1)


# ── Tax scales ────────────────────────────────────────────────────────


def seed_tax_scales(db: Session, *, company_id: uuid.UUID) -> int:
    """Copy the statutory defaults into editable company rows.

    Seeded rather than read from code so a tenant can correct a slab immediately. Every
    row lands with `is_verified = False`: nobody has checked these against the Act.
    """
    if db.execute(select(TaxScale.id).where(TaxScale.company_id == company_id)).first():
        return 0

    created = 0
    for fiscal_year, scale in statutory.SCALES.items():
        for is_married, slabs in ((False, scale.single), (True, scale.married)):
            row = TaxScale(
                company_id=company_id, fiscal_year=fiscal_year, is_married=is_married
            )
            db.add(row)
            db.flush()
            for index, slab in enumerate(slabs):
                db.add(
                    TaxSlab(
                        company_id=company_id,
                        tax_scale_id=row.id,
                        sequence=index,
                        width=slab.width,
                        rate=slab.rate,
                        label=slab.label,
                    )
                )
            created += 1

    db.commit()
    return created


def load_scale(
    db: Session, *, company_id: uuid.UUID, fiscal_year: str, is_married: bool
) -> tuple[tuple[statutory.Slab, ...], bool]:
    """The company's slabs for a year, and whether anyone has verified them."""
    seed_tax_scales(db, company_id=company_id)

    scale = db.execute(
        select(TaxScale).where(
            TaxScale.company_id == company_id,
            TaxScale.fiscal_year == fiscal_year,
            TaxScale.is_married == is_married,
        )
    ).scalar_one_or_none()

    if scale is None:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, f"No tax scale configured for {fiscal_year}"
        )

    slabs = tuple(
        statutory.Slab(width=row.width, rate=row.rate, label=row.label)
        for row in db.execute(
            select(TaxSlab)
            .where(TaxSlab.tax_scale_id == scale.id)
            .order_by(TaxSlab.sequence)
        ).scalars()
    )
    return slabs, scale.is_verified


# ── Salary ────────────────────────────────────────────────────────────


def salary_on(
    db: Session, *, company_id: uuid.UUID, employee_id: uuid.UUID, on: date
) -> EmployeeSalary | None:
    """The salary row covering a date — not necessarily the current one.

    Paying March with June's salary is the mistake that makes historical payroll
    impossible, so the period drives the lookup.
    """
    return db.execute(
        select(EmployeeSalary)
        .where(
            EmployeeSalary.company_id == company_id,
            EmployeeSalary.employee_id == employee_id,
            EmployeeSalary.effective_from <= on,
            (EmployeeSalary.effective_to.is_(None)) | (EmployeeSalary.effective_to >= on),
        )
        .order_by(EmployeeSalary.effective_from.desc())
    ).scalars().first()


def set_salary(
    db: Session,
    *,
    company_id: uuid.UUID,
    employee_id: uuid.UUID,
    basic: Decimal,
    effective_from: date,
    contributes_to_ssf: bool = True,
    life_insurance_premium: Decimal = ZERO,
    health_insurance_premium: Decimal = ZERO,
    note: str | None = None,
) -> EmployeeSalary:
    """Open a new salary period, closing the previous one the day before.

    Same shape as an employee assignment, and for the same reason: no date may belong to
    two salary rows, or payroll has to choose between them.
    """
    current = db.execute(
        select(EmployeeSalary).where(
            EmployeeSalary.company_id == company_id,
            EmployeeSalary.employee_id == employee_id,
            EmployeeSalary.effective_to.is_(None),
        )
    ).scalar_one_or_none()

    if current is not None:
        if effective_from <= current.effective_from:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                "A salary cannot start on or before the current one began",
            )
        current.effective_to = effective_from - _ONE_DAY

    row = EmployeeSalary(
        company_id=company_id,
        employee_id=employee_id,
        basic=basic,
        contributes_to_ssf=contributes_to_ssf,
        life_insurance_premium=life_insurance_premium,
        health_insurance_premium=health_insurance_premium,
        effective_from=effective_from,
        note=note,
    )
    db.add(row)
    return row


# ── Running payroll ───────────────────────────────────────────────────


def compute_run(db: Session, *, run: PayrollRun) -> int:
    """Compute every payslip in a run. Returns how many were written.

    Idempotent while the run is unapproved: it clears and rebuilds. Once approved, it
    refuses — a payslip that has been signed off is not a draft any more.
    """
    if run.status in (RunStatus.APPROVED, RunStatus.PAID):
        raise HTTPException(
            status.HTTP_409_CONFLICT, "This run is approved; it can no longer be recomputed"
        )

    company_id = run.company_id
    attendance = _attendance_totals(
        db, company_id=company_id, start=run.period_start, end=run.period_end
    )

    # Clear any previous draft so recomputing cannot double up.
    for old in db.execute(
        select(Payslip).where(Payslip.payroll_run_id == run.id)
    ).scalars():
        db.delete(old)
    db.flush()

    components = {
        c.id: c
        for c in db.execute(
            select(SalaryComponent).where(SalaryComponent.company_id == company_id)
        ).scalars()
    }

    written = 0
    for employee in db.execute(
        select(Employee).where(
            Employee.company_id == company_id,
            Employee.joined_on <= run.period_end,
        )
    ).scalars():
        if employee.exited_on and employee.exited_on < run.period_start:
            continue
        if employee.status is EmployeeStatus.SUSPENDED:
            continue

        salary = salary_on(
            db, company_id=company_id, employee_id=employee.id, on=run.period_end
        )
        if salary is None:
            continue  # nobody has set a salary yet; not an error, just nothing to pay

        totals = attendance.get(
            employee.id,
            {"payable_days": run.month_days, "present": 0, "absent": 0, "overtime": 0},
        )

        earnings: list[compute.EarningLine] = []
        deductions: list[compute.DeductionLine] = []
        for line in db.execute(
            select(EmployeeSalaryLine).where(
                EmployeeSalaryLine.employee_salary_id == salary.id
            )
        ).scalars():
            component = components.get(line.salary_component_id)
            if component is None:
                continue
            if component.kind is ComponentKind.EARNING:
                earnings.append(
                    compute.EarningLine(
                        code=component.code,
                        label=component.name,
                        amount=line.amount,
                        taxable=component.is_taxable,
                        prorates=component.prorates,
                    )
                )
            else:
                deductions.append(
                    compute.DeductionLine(
                        code=component.code, label=component.name, amount=line.amount
                    )
                )

        slabs, _verified = load_scale(
            db,
            company_id=company_id,
            fiscal_year=run.fiscal_year,
            is_married=bool(employee.marital_status == "married"),
        )

        result = compute.compute_payslip(
            compute.PayslipInput(
                basic=salary.basic,
                earnings=tuple(earnings),
                deductions=tuple(deductions),
                payable_days=Decimal(str(totals["payable_days"])),
                month_days=run.month_days,
                overtime_minutes=int(totals["overtime"]),
                is_married=bool(employee.marital_status == "married"),
                is_female=bool(employee.gender == "female"),
                contributes_to_ssf=salary.contributes_to_ssf,
                life_insurance_premium=salary.life_insurance_premium,
                health_insurance_premium=salary.health_insurance_premium,
            ),
            slabs=slabs,
        )

        payslip = Payslip(
            company_id=company_id,
            payroll_run_id=run.id,
            employee_id=employee.id,
            payable_days=Decimal(str(totals["payable_days"])),
            present_days=int(totals["present"]),
            absent_days=int(totals["absent"]),
            overtime_minutes=int(totals["overtime"]),
            basic_earned=result.basic_earned,
            overtime_pay=result.overtime_pay,
            gross=result.gross,
            taxable_gross=result.taxable_gross,
            ssf_employee=result.ssf_employee,
            ssf_employer=result.ssf_employer,
            annual_assessable=result.annual_assessable,
            annual_taxable=result.annual_taxable,
            annual_tax=result.annual_tax,
            female_rebate=result.female_rebate,
            monthly_tax=result.monthly_tax,
            total_deductions=result.total_deductions,
            net_pay=result.net_pay,
            notes="; ".join(result.notes) or None,
        )
        db.add(payslip)
        db.flush()

        for index, line in enumerate(result.earnings):
            db.add(
                PayslipLine(
                    company_id=company_id,
                    payslip_id=payslip.id,
                    kind=ComponentKind.EARNING,
                    code=line["code"],
                    label=line["label"],
                    amount=line["amount"],
                    sequence=index,
                )
            )
        for index, line in enumerate(result.deductions):
            db.add(
                PayslipLine(
                    company_id=company_id,
                    payslip_id=payslip.id,
                    kind=ComponentKind.DEDUCTION,
                    code=line["code"],
                    label=line["label"],
                    amount=line["amount"],
                    sequence=index,
                )
            )
        for index, band in enumerate(result.tax_breakdown):
            db.add(
                PayslipTaxBand(
                    company_id=company_id,
                    payslip_id=payslip.id,
                    sequence=index,
                    label=band["label"],
                    rate=band["rate"],
                    amount=band["amount"],
                    tax=band["tax"],
                )
            )
        written += 1

    run.status = RunStatus.COMPUTED
    run.computed_at = datetime.now(UTC)
    db.commit()
    return written


def approve_run(db: Session, *, run: PayrollRun, user_id: uuid.UUID) -> int:
    """Approve, and lock the attendance behind it.

    Locking is the point. Once a month is paid, reprocessing attendance for it must not
    move a figure someone has already been paid on — `process_range` skips locked days.
    """
    if run.status is not RunStatus.COMPUTED:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Only a computed run can be approved"
        )

    locked = 0
    for day in db.execute(
        select(AttendanceDay).where(
            AttendanceDay.company_id == run.company_id,
            AttendanceDay.work_date.between(run.period_start, run.period_end),
            AttendanceDay.is_locked.is_(False),
        )
    ).scalars():
        day.is_locked = True
        locked += 1

    run.status = RunStatus.APPROVED
    run.approved_at = datetime.now(UTC)
    run.approved_by_user_id = user_id
    db.commit()
    return locked


def _attendance_totals(
    db: Session, *, company_id: uuid.UUID, start: date, end: date
) -> dict[uuid.UUID, dict]:
    """Per-employee totals for the period, from the attendance register."""
    totals: dict[uuid.UUID, dict] = {}

    for day in db.execute(
        select(AttendanceDay).where(
            AttendanceDay.company_id == company_id,
            AttendanceDay.work_date.between(start, end),
        )
    ).scalars():
        row = totals.setdefault(
            day.employee_id,
            {"payable_days": Decimal("0"), "present": 0, "absent": 0, "overtime": 0},
        )
        row["overtime"] += day.overtime_minutes

        match day.status:
            case DayStatus.PRESENT:
                row["present"] += 1
                row["payable_days"] += Decimal("1")
            case DayStatus.HALF_DAY:
                row["present"] += 1
                row["payable_days"] += Decimal("0.5")
            case DayStatus.ABSENT:
                row["absent"] += 1
            case DayStatus.LEAVE | DayStatus.HOLIDAY | DayStatus.WEEKLY_OFF:
                # Paid leave, public holidays and the weekly rest day are all payable.
                # Unpaid leave lands in phase 05's ledger and is deducted there.
                row["payable_days"] += Decimal("1")

    return totals
