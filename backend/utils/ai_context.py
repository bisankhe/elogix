"""
FILE: backend/utils/ai_context.py
Builds rich AI context objects for every NepHR Pro page.
Each function gathers the right DB data and structures it for Claude API calls.
Used by: structure_routes, workforce_routes, org_routes, dept_team_routes.
"""
from sqlalchemy import func, text
from datetime import date, datetime


def build_company_context(db, company_id: str) -> dict:
    """Base company context — included in every AI call."""
    row = db.session.execute(text("""
        SELECT name, industry, province, employee_count_band,
               collective_bargaining_active, min_wage_applicable,
               ssf_employer_no, labour_office_zone, fiscal_year_type
        FROM companies WHERE id = :cid AND NOT is_deleted
    """), {"cid": company_id}).fetchone()
    if not row:
        return {"company_id": company_id}
    r = dict(row._mapping)
    r["nepal_law_context"] = {
        "min_wage_npr": 15000,
        "max_probation_months": 6,
        "max_casual_days_month": 7,
        "pf_employer_pct": 10.0,
        "ssf_employer_pct": 3.33,
        "gratuity_pct": 8.33,
        "ot_multiplier": 1.5,
        "cba_threshold": 10,
        "safety_committee_threshold": 20,
    }
    return r


def build_dept_ai_context(db, company_id: str, department_id: str = None) -> dict:
    """Context for Department Setup AI insights."""
    base = build_company_context(db, company_id)

    dept_stats = db.session.execute(text("""
        SELECT
            COUNT(*)                                                     AS total_depts,
            SUM(headcount_actual)                                        AS total_headcount,
            SUM(headcount_target)                                        AS total_target,
            SUM(annual_budget)                                           AS total_budget,
            COUNT(*) FILTER (WHERE cba_applicable)                       AS cba_depts,
            COUNT(*) FILTER (WHERE ai_attrition_risk IN ('high','critical')) AS high_risk_depts
        FROM departments
        WHERE company_id = :cid AND NOT is_deleted
    """), {"cid": company_id}).fetchone()

    context = {
        **base,
        "department_stats": dict(dept_stats._mapping) if dept_stats else {},
        "analysis_date": date.today().isoformat(),
    }

    if department_id:
        dept = db.session.execute(text("""
            SELECT d.*, bu.name AS business_unit_name,
                   COUNT(t.id) AS team_count,
                   COUNT(s.id) AS section_count
            FROM departments d
            LEFT JOIN business_units bu ON d.business_unit_id = bu.id
            LEFT JOIN teams t ON t.department_id = d.id AND NOT t.is_deleted
            LEFT JOIN sections s ON s.department_id = d.id AND NOT s.is_deleted
            WHERE d.id = :did AND NOT d.is_deleted
            GROUP BY d.id, bu.name
        """), {"did": department_id}).fetchone()
        if dept:
            context["department"] = dict(dept._mapping)

    return context


def build_team_ai_context(db, company_id: str, team_id: str = None) -> dict:
    """Context for Team Setup Nepal law AI insights."""
    base = build_company_context(db, company_id)

    teams_needing_cba = db.session.execute(text("""
        SELECT t.name, t.member_count, d.name AS dept
        FROM teams t LEFT JOIN departments d ON t.department_id = d.id
        WHERE t.company_id = :cid AND t.cba_required AND NOT t.is_deleted
    """), {"cid": company_id}).fetchall()

    teams_needing_safety = db.session.execute(text("""
        SELECT t.name, t.member_count, d.name AS dept
        FROM teams t LEFT JOIN departments d ON t.department_id = d.id
        WHERE t.company_id = :cid AND t.safety_committee_required AND NOT t.is_deleted
    """), {"cid": company_id}).fetchall()

    return {
        **base,
        "cba_action_teams":    [dict(r._mapping) for r in teams_needing_cba],
        "safety_action_teams": [dict(r._mapping) for r in teams_needing_safety],
        "nepal_law_thresholds": {"cba": 10, "safety_committee": 20},
        "analysis_date": date.today().isoformat(),
    }


def build_grade_ai_context(db, company_id: str) -> dict:
    """Context for Grade Level AI benchmarking."""
    base = build_company_context(db, company_id)

    grades = db.session.execute(text("""
        SELECT code, name, salary_min, salary_mid, salary_max, category,
               (SELECT COUNT(*) FROM positions WHERE grade_level_id = gl.id AND NOT is_deleted) AS position_count,
               (SELECT COUNT(*) FROM positions WHERE grade_level_id = gl.id AND status = 'filled' AND NOT is_deleted) AS filled_count
        FROM grade_levels gl
        WHERE company_id = :cid AND NOT is_deleted
        ORDER BY level_order
    """), {"cid": company_id}).fetchall()

    return {
        **base,
        "grade_matrix": [dict(r._mapping) for r in grades],
        "nepal_min_wage": 15000,
        "currency": "NPR",
        "analysis_date": date.today().isoformat(),
    }


def build_org_chart_ai_context(db, company_id: str) -> dict:
    """Context for Org Chart + Reporting Hierarchy AI restructure."""
    base = build_company_context(db, company_id)

    span_data = db.session.execute(text("""
        SELECT manager_id, COUNT(*) AS direct_reports,
               CASE WHEN COUNT(*) < 3 THEN 'underloaded'
                    WHEN COUNT(*) > 10 THEN 'overloaded'
                    ELSE 'optimal' END AS span_status
        FROM reporting_relationships
        WHERE company_id = :cid AND status = 'active' AND NOT is_deleted
        GROUP BY manager_id
        ORDER BY direct_reports DESC
    """), {"cid": company_id}).fetchall()

    pos_stats = db.session.execute(text("""
        SELECT
            COUNT(*)                                        AS total_positions,
            COUNT(*) FILTER (WHERE status = 'filled')      AS filled,
            COUNT(*) FILTER (WHERE status = 'vacant')      AS vacant,
            COUNT(*) FILTER (WHERE is_critical)            AS critical,
            COUNT(*) FILTER (WHERE is_critical AND NOT succession_ready) AS critical_no_succession
        FROM positions WHERE company_id = :cid AND NOT is_deleted
    """), {"cid": company_id}).fetchone()

    return {
        **base,
        "span_of_control": [dict(r._mapping) for r in span_data],
        "position_stats":  dict(pos_stats._mapping) if pos_stats else {},
        "recommended_span": {"min": 3, "max": 10, "optimal_range": "5-8"},
        "analysis_date": date.today().isoformat(),
    }


def build_position_ai_context(db, company_id: str, position_id: str) -> dict:
    """Context for Position attrition risk analysis."""
    base = build_company_context(db, company_id)

    pos = db.session.execute(text("""
        SELECT p.position_title, p.status, p.is_critical, p.succession_ready,
               p.headcount_type, p.fte, p.incumbent_name, p.incumbent_id,
               p.filled_date,
               d.name AS department, gl.code AS grade, gl.salary_min, gl.salary_max,
               des.name AS designation, des.is_managerial
        FROM positions p
        LEFT JOIN departments d  ON p.department_id   = d.id
        LEFT JOIN grade_levels gl ON p.grade_level_id  = gl.id
        LEFT JOIN designations des ON p.designation_id = des.id
        WHERE p.id = :pid AND p.company_id = :cid
    """), {"pid": position_id, "cid": company_id}).fetchone()

    direct_reports = db.session.execute(text("""
        SELECT COUNT(*) FROM reporting_relationships
        WHERE manager_id = :emp AND status = 'active' AND NOT is_deleted
    """), {"emp": pos.incumbent_id if pos and pos.incumbent_id else "00000000-0000-0000-0000-000000000000"}).scalar()

    tenure_days = None
    if pos and pos.filled_date:
        tenure_days = (date.today() - pos.filled_date).days

    return {
        **base,
        "position": dict(pos._mapping) if pos else {},
        "direct_reports_count": direct_reports,
        "tenure_days": tenure_days,
        "analysis_date": date.today().isoformat(),
    }


def build_vendor_ai_context(db, company_id: str, vendor_id: str = None) -> dict:
    """Context for Vendor Performance AI scorecard generation."""
    base = build_company_context(db, company_id)

    vendors = db.session.execute(text("""
        SELECT ov.id, ov.vendor_name, ov.service_category,
               ov.moless_license_no, ov.moless_license_expiry, ov.is_licensed_agency,
               COUNT(ve.id)                                                       AS total_workers,
               COUNT(ve.id) FILTER (WHERE NOT ve.ssf_paid_current_month)          AS ssf_violations,
               COUNT(ve.id) FILTER (WHERE NOT ve.insurance_active)                AS insurance_violations,
               COUNT(vi.id) FILTER (WHERE vi.has_discrepancy)                     AS billing_disputes,
               ROUND(AVG(va.ghost_risk_score)::NUMERIC, 1)                        AS avg_ghost_risk
        FROM outsource_vendors ov
        LEFT JOIN vendor_employees ve ON ve.vendor_id = ov.id AND NOT ve.is_deleted
        LEFT JOIN vendor_invoices vi  ON vi.vendor_id = ov.id AND NOT vi.is_deleted
        LEFT JOIN vendor_attendance va ON va.vendor_id = ov.id
        WHERE ov.company_id = :cid AND NOT ov.is_deleted
          AND (:vid::TEXT IS NULL OR ov.id::TEXT = :vid)
        GROUP BY ov.id, ov.vendor_name, ov.service_category,
                 ov.moless_license_no, ov.moless_license_expiry, ov.is_licensed_agency
    """), {"cid": company_id, "vid": vendor_id}).fetchall()

    return {
        **base,
        "vendors": [dict(r._mapping) for r in vendors],
        "nepal_law": {
            "moless_required": True,
            "non_core_only": True,
            "co_liability_section": "Section 55",
            "min_wage": 15000,
        },
        "analysis_date": date.today().isoformat(),
    }


def build_invoice_ai_context(db, company_id: str, invoice_id: str) -> dict:
    """Context for AI invoice validation."""
    inv = db.session.execute(text("""
        SELECT vi.invoice_number, vi.total_amount_npr, vi.workers_billed,
               vi.days_billed, vi.rate_per_day_npr, vi.invoice_period_month,
               vi.invoice_period_year, vi.tds_rate_pct,
               ov.vendor_name, sc.rate_per_worker_per_day AS contract_rate,
               sc.max_workers_allowed
        FROM vendor_invoices vi
        JOIN outsource_vendors ov ON ov.id = vi.vendor_id
        JOIN sla_contracts sc     ON sc.id = vi.contract_id
        WHERE vi.id = :iid AND vi.company_id = :cid
    """), {"iid": invoice_id, "cid": company_id}).fetchone()

    # Actual attendance data for cross-check
    att = db.session.execute(text("""
        SELECT COUNT(*) FILTER (WHERE is_present)      AS present_days,
               COUNT(DISTINCT vendor_employee_id)       AS unique_workers,
               SUM(overtime_hours)                      AS total_ot,
               COUNT(*) FILTER (WHERE NOT biometric_verified) AS manual_entries
        FROM vendor_attendance
        WHERE contract_id = (
            SELECT contract_id FROM vendor_invoices WHERE id = :iid
        )
        AND period_year  = EXTRACT(YEAR  FROM CURRENT_DATE)::INT
        AND period_month = EXTRACT(MONTH FROM CURRENT_DATE)::INT
    """), {"iid": invoice_id}).fetchone()

    return {
        "invoice": dict(inv._mapping) if inv else {},
        "attendance_data": dict(att._mapping) if att else {},
        "nepal_tds_rate": 1.5,
        "validation_rules": {
            "amount_formula": "workers × days × daily_rate",
            "max_variance_pct": 2.0,
            "flag_threshold_npr": 1000,
        },
    }
