"""
FILE: backend/utils/excel_import.py
SAP-style Excel Import utility for eLogix HRMS.
Supports: .xlsx, .xls, .csv upload + validation + AI column mapping.
Used by every frontend page (SAP-style Excel upload requirement).
"""
import io
import csv
import uuid
from typing import Any
from datetime import date, datetime
from flask import request, jsonify, g

try:
    import openpyxl
    OPENPYXL_AVAILABLE = True
except ImportError:
    OPENPYXL_AVAILABLE = False

# ── Column templates per module ───────────────────────────────
IMPORT_TEMPLATES = {
    "group_company": {
        "required": ["code", "name"],
        "optional": ["name_nepali", "short_name", "registration_no", "pan_no",
                     "established_year", "group_type", "website"],
        "sample_rows": [
            {"code": "NHG", "name": "Nepal Holding Group", "name_nepali": "नेपाल होल्डिङ ग्रुप",
             "group_type": "conglomerate", "pan_no": "123456789"},
        ],
    },
    "company": {
        "required": ["code", "name", "registration_type"],
        "optional": ["name_nepali", "pan_no", "vat_no", "province", "district",
                     "phone", "email", "labour_office_zone", "ssf_employer_no"],
        "sample_rows": [
            {"code": "NP-001", "name": "eLogix Technologies Pvt. Ltd.",
             "registration_type": "private_limited", "pan_no": "987654321",
             "province": "Bagmati", "district": "Kathmandu"},
        ],
    },
    "branch": {
        "required": ["code", "name", "branch_type"],
        "optional": ["province", "district", "municipality", "ward_no",
                     "phone", "email", "labour_office_zone", "capacity"],
        "sample_rows": [
            {"code": "KTM-HQ", "name": "Kathmandu Headquarters",
             "branch_type": "headquarters", "province": "Bagmati",
             "district": "Kathmandu", "labour_office_zone": "Bagmati Zone"},
        ],
    },
    "department": {
        "required": ["code", "name"],
        "optional": ["name_nepali", "function_type", "ulrich_model",
                     "headcount_target", "annual_budget", "is_core_function"],
        "sample_rows": [
            {"code": "IT", "name": "Information Technology", "function_type": "core",
             "ulrich_model": "center_of_excellence", "headcount_target": 25},
        ],
    },
    "team": {
        "required": ["code", "name", "team_type"],
        "optional": ["name_nepali", "member_count", "max_size", "is_managerial",
                     "start_date", "project_code"],
        "validation_notes": "CBA required if member_count >= 10 (Labour Act 2074 Section 108). Safety Committee if >= 20.",
        "sample_rows": [
            {"code": "FE-TEAM", "name": "Frontend Development Team",
             "team_type": "functional", "member_count": 8, "is_managerial": False},
        ],
    },
    "grade_level": {
        "required": ["code", "name", "salary_min", "salary_max"],
        "optional": ["name_nepali", "grade_number", "level_order", "category",
                     "salary_mid", "pf_pct_employer", "increment_pct_min", "increment_pct_max"],
        "validation_notes": "salary_min must be >= NPR 15,000 (Nepal minimum wage).",
        "sample_rows": [
            {"code": "L1", "name": "Level 1 - Junior", "salary_min": 15000,
             "salary_mid": 20000, "salary_max": 25000, "category": "staff"},
        ],
    },
    "designation": {
        "required": ["code", "name"],
        "optional": ["name_nepali", "category", "is_managerial", "approved_positions",
                     "jd_experience_years", "jd_education_level"],
        "sample_rows": [
            {"code": "SE", "name": "Software Engineer", "category": "staff",
             "is_managerial": False, "approved_positions": 5, "jd_experience_years": 2},
        ],
    },
    "employment_category": {
        "required": ["code", "name", "la_type"],
        "optional": ["name_nepali", "la_section", "written_contract_required",
                     "max_probation_months", "max_days_per_month",
                     "pf_eligible", "ssf_eligible", "annual_leave_days", "sick_leave_days"],
        "validation_notes": "max_probation_months <= 6, max_days_per_month <= 7 (Labour Act 2074).",
        "sample_rows": [
            {"code": "REG", "name": "Regular / Permanent", "la_type": "regular",
             "la_section": "Section 10(a)", "written_contract_required": True,
             "max_probation_months": 6, "pf_eligible": True, "ssf_eligible": True},
        ],
    },
    "outsource_vendor": {
        "required": ["vendor_code", "vendor_name", "moless_license_no"],
        "optional": ["vendor_name_nepali", "service_category", "moless_license_expiry",
                     "agency_pan", "contact_person", "contact_email", "contact_phone", "address"],
        "validation_notes": "moless_license_no mandatory per Nepal Labour Act 2074 Section 52.",
        "sample_rows": [
            {"vendor_code": "SG-001", "vendor_name": "ShieldGuard Nepal Pvt. Ltd.",
             "moless_license_no": "LS-MoLESS-2024-0012", "service_category": "Security Services",
             "contact_person": "Ram Prasad Sharma", "contact_email": "info@shieldguard.com.np"},
        ],
    },
    "vendor_employee": {
        "required": ["vendor_emp_id", "name", "role", "vendor_code"],
        "optional": ["name_nepali", "service_category", "assigned_location",
                     "shift_type", "join_date", "monthly_wage_npr", "daily_rate_npr"],
        "validation_notes": "monthly_wage_npr >= NPR 15,000 (co-liability per Section 55). VE- prefix recommended for vendor_emp_id.",
        "sample_rows": [
            {"vendor_emp_id": "VE-001", "name": "Ramesh Shrestha", "role": "Security Guard",
             "vendor_code": "SG-001", "shift_type": "Night", "monthly_wage_npr": 18000},
        ],
    },
    "position": {
        "required": ["position_code", "position_title", "designation_code"],
        "optional": ["department_code", "grade_level_code", "employment_category",
                     "fte", "is_critical", "headcount_type",
                     "approved_salary_min", "approved_salary_max"],
        "sample_rows": [
            {"position_code": "POS-IT-001", "position_title": "Senior Software Engineer",
             "designation_code": "SSE", "department_code": "IT",
             "grade_level_code": "L3", "fte": 1.0, "is_critical": False},
        ],
    },
}

# ── Parse uploaded file ───────────────────────────────────────
def parse_excel_upload(file_obj, module: str) -> dict:
    """
    Parse an uploaded Excel/CSV file and validate against module template.
    Returns: {rows, errors, warnings, preview}
    """
    filename = getattr(file_obj, "filename", "upload.xlsx")
    template = IMPORT_TEMPLATES.get(module)
    if not template:
        return {"success": False, "error": f"Unknown module: {module}"}

    rows, errors, warnings = [], [], []

    try:
        content = file_obj.read()
        ext = filename.rsplit(".", 1)[-1].lower()

        if ext == "csv":
            rows = _parse_csv(content)
        elif ext in ("xlsx", "xls") and OPENPYXL_AVAILABLE:
            rows = _parse_xlsx(content)
        else:
            return {"success": False, "error": f"Unsupported file type: {ext}. Use .xlsx or .csv"}
    except Exception as e:
        return {"success": False, "error": f"File parse error: {str(e)}"}

    if not rows:
        return {"success": False, "error": "File is empty or no data rows found"}

    # Validate each row
    valid_rows, row_errors = [], []
    for i, row in enumerate(rows, start=2):  # Row 2+ (row 1 = header)
        row_err = _validate_row(row, template, i, module)
        if row_err["errors"]:
            row_errors.extend(row_err["errors"])
        else:
            valid_rows.append(row_err["cleaned"])
        warnings.extend(row_err.get("warnings", []))

    return {
        "success":     len(row_errors) == 0,
        "total_rows":  len(rows),
        "valid_rows":  len(valid_rows),
        "error_rows":  len(rows) - len(valid_rows),
        "data":        valid_rows,
        "errors":      row_errors,
        "warnings":    warnings,
        "preview":     valid_rows[:5],
        "module":      module,
        "template":    template,
    }

def _parse_csv(content: bytes) -> list[dict]:
    text = content.decode("utf-8-sig", errors="replace")
    reader = csv.DictReader(io.StringIO(text))
    return [dict(row) for row in reader]

def _parse_xlsx(content: bytes) -> list[dict]:
    wb = openpyxl.load_workbook(io.BytesIO(content), read_only=True, data_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        return []
    headers = [str(h).strip().lower().replace(" ", "_") if h else f"col_{i}"
               for i, h in enumerate(rows[0])]
    return [dict(zip(headers, row)) for row in rows[1:] if any(c is not None for c in row)]

def _validate_row(row: dict, template: dict, row_num: int, module: str) -> dict:
    errors, warnings, cleaned = [], [], {}

    # Check required fields
    for field in template.get("required", []):
        val = row.get(field)
        if val is None or str(val).strip() == "":
            errors.append({"row": row_num, "field": field, "error": f"Required field '{field}' is missing"})
        else:
            cleaned[field] = _coerce(field, val)

    # Copy optional fields
    for field in template.get("optional", []):
        if field in row and row[field] is not None and str(row[field]).strip():
            cleaned[field] = _coerce(field, row[field])

    # Module-specific Nepal law validations
    if module == "team":
        mc = cleaned.get("member_count", 0)
        if isinstance(mc, int):
            if mc >= 10 and not cleaned.get("is_managerial"):
                warnings.append({"row": row_num, "warning": f"CBA required: {mc} members >= 10 (Labour Act 2074 Section 108)"})
            if mc >= 20:
                warnings.append({"row": row_num, "warning": f"Safety Committee mandatory: {mc} members >= 20 (Section 155)"})

    if module == "employment_category":
        prob = cleaned.get("max_probation_months", 0)
        if prob and int(prob) > 6:
            errors.append({"row": row_num, "field": "max_probation_months",
                           "error": "max_probation_months cannot exceed 6 (Nepal Labour Act 2074, Section 10)"})
        days = cleaned.get("max_days_per_month", 0)
        if days and int(days) > 7:
            errors.append({"row": row_num, "field": "max_days_per_month",
                           "error": "max_days_per_month cannot exceed 7 for casual workers (Labour Act 2074, Section 10(d))"})

    if module == "grade_level":
        sal_min = cleaned.get("salary_min", 0)
        if sal_min and float(sal_min) < 15000:
            errors.append({"row": row_num, "field": "salary_min",
                           "error": "salary_min must be >= NPR 15,000 (Nepal Minimum Wage 2024)"})

    if module == "vendor_employee":
        wage = cleaned.get("monthly_wage_npr", 0)
        if wage and float(wage) < 15000:
            errors.append({"row": row_num, "field": "monthly_wage_npr",
                           "error": "monthly_wage_npr < NPR 15,000 violates minimum wage. Main employer co-liable per Section 55."})

    if module == "outsource_vendor":
        if not cleaned.get("moless_license_no"):
            errors.append({"row": row_num, "field": "moless_license_no",
                           "error": "MoLESS license number is mandatory (Nepal Labour Act 2074, Section 52)"})

    return {"errors": errors, "warnings": warnings, "cleaned": cleaned}

def _coerce(field: str, val: Any) -> Any:
    """Type coercion for common field names."""
    if val is None:
        return None
    s = str(val).strip()

    bool_fields = {"is_managerial", "is_core_function", "is_headquarters",
                   "pf_eligible", "ssf_eligible", "gratuity_eligible", "medical_eligible",
                   "maternity_eligible", "paternity_eligible", "cba_eligible",
                   "written_contract_required", "vat_registered", "is_critical",
                   "has_canteen", "has_creche", "biometric_enabled"}
    int_fields  = {"headcount_target", "headcount_actual", "member_count", "max_size",
                   "approved_positions", "filled_positions", "max_probation_months",
                   "max_days_per_month", "annual_leave_days", "sick_leave_days",
                   "established_year", "grade_number", "level_order", "sort_order",
                   "jd_experience_years", "renewal_alert_days", "termination_notice_days",
                   "workers_billed", "days_billed"}
    float_fields= {"salary_min", "salary_mid", "salary_max", "annual_budget",
                   "revenue_target", "monthly_wage_npr", "daily_rate_npr",
                   "rate_per_worker_per_day", "amount_before_tax_npr", "total_amount_npr",
                   "pf_pct_employer", "ssf_pct_employer", "gratuity_pct",
                   "fte", "ai_ghost_risk_score", "ai_compliance_score"}
    date_fields = {"join_date", "start_date", "end_date", "expiry_date", "issue_date",
                   "established_date", "moless_license_expiry", "registration_date"}

    if field in bool_fields:
        return s.lower() in ("true", "yes", "1", "y", "t")
    if field in int_fields:
        try: return int(float(s))
        except: return None
    if field in float_fields:
        try: return float(s)
        except: return None
    if field in date_fields:
        for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%m/%d/%Y"):
            try: return datetime.strptime(s, fmt).date().isoformat()
            except: continue
        return None
    return s

# ── Template download endpoint helper ─────────────────────────
def build_template_xlsx(module: str) -> bytes | None:
    """Generate a downloadable Excel template for the given module."""
    if not OPENPYXL_AVAILABLE:
        return None
    template = IMPORT_TEMPLATES.get(module)
    if not template:
        return None

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = module.replace("_", " ").title()

    # Header row
    all_cols = template["required"] + template["optional"]
    for col_idx, col in enumerate(all_cols, 1):
        cell = ws.cell(row=1, column=col_idx, value=col)
        # Mark required columns
        if col in template["required"]:
            cell.font = openpyxl.styles.Font(bold=True)

    # Sample rows
    for row_idx, sample in enumerate(template.get("sample_rows", []), 2):
        for col_idx, col in enumerate(all_cols, 1):
            ws.cell(row=row_idx, column=col_idx, value=sample.get(col, ""))

    # Notes sheet
    notes_ws = wb.create_sheet("Instructions")
    notes_ws["A1"] = "eLogix HRMS — Import Instructions"
    notes_ws["A2"] = f"Module: {module}"
    notes_ws["A3"] = f"Required columns: {', '.join(template['required'])}"
    notes_ws["A4"] = template.get("validation_notes", "")
    notes_ws["A5"] = "Bold columns = Required. Delete sample rows before importing."

    out = io.BytesIO()
    wb.save(out)
    return out.getvalue()
