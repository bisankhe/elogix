# NepHR Pro — Backend & Database File Map

## Backend Structure

```
backend/
├── __init__.py                          — App factory import
├── app.py                               — Flask create_app() factory
├── extensions.py                        — Shared db = SQLAlchemy()
│
├── config/
│   ├── settings.py                      — Dev/Prod/Test config
│   └── requirements.txt                 — Python dependencies
│
├── models/                              — SQLAlchemy ORM Models
│   ├── org_models.py                    — GroupCompany, Company, CompanyLegalDoc,
│   │                                      Branch, BusinessUnit, Department,
│   │                                      Section, Unit, Team, CostCenter, WorkLocation
│   ├── structure_models.py              — EmploymentCategory (11 types),
│   │                                      JobFamily, GradeLevel, Designation,
│   │                                      ReportingRelationship, OrgChartNode, Position
│   ├── workforce_config_models.py       — EmploymentTypeConfig, OutsourceVendor,
│   │                                      SLAContract, SLAKPIResult, VendorEmployee,
│   │                                      VendorInvoice, VendorAttendance,
│   │                                      VendorPerformanceCard
│   └── [legacy models — superseded by above]
│       ├── org_setup_models.py
│       ├── structure_hierarchy_models.py
│       ├── position_management_models.py
│       └── employment_category_models.py
│
├── routes/                              — Flask Blueprints (REST API)
│   ├── org_routes.py                    — /api/v1/org/*
│   │   ├── GET  /group-companies
│   │   ├── POST /group-companies
│   │   ├── GET  /companies
│   │   ├── POST /companies
│   │   ├── GET  /companies/<id>/setup-wizard
│   │   ├── GET  /companies/<id>/ai-compliance
│   │   ├── GET  /companies/<id>/departments
│   │   ├── POST /companies/<id>/departments
│   │   ├── GET  /companies/<id>/designations
│   │   ├── POST /companies/<id>/designations/<id>/generate-jd  [AI]
│   │   ├── GET  /companies/<id>/grade-levels
│   │   ├── GET  /companies/<id>/positions
│   │   ├── GET  /companies/<id>/org-chart
│   │   ├── POST /companies/<id>/positions/<id>/ai-risk         [AI]
│   │   ├── POST /companies/<id>/teams                          [Nepal Law Auto-Check]
│   │   ├── GET  /companies/<id>/employment-categories
│   │   └── GET  /companies/<id>/ai-insights/workforce-summary  [AI]
│   │
│   └── workforce_routes.py              — /api/v1/workforce/*
│       ├── GET  /companies/<id>/employment-type/overview
│       ├── GET  /companies/<id>/vendors
│       ├── POST /companies/<id>/vendors
│       ├── GET  /companies/<id>/sla-contracts
│       ├── POST /companies/<id>/sla-contracts
│       ├── GET  /companies/<id>/vendor-invoices
│       ├── POST /companies/<id>/vendor-invoices/<id>/ai-validate  [AI]
│       ├── POST /companies/<id>/vendor-invoices/<id>/approve
│       ├── POST /companies/<id>/vendor-invoices/<id>/dispute
│       ├── GET  /companies/<id>/vendor-attendance
│       ├── POST /companies/<id>/vendor-attendance/ai-ghost-scan  [AI]
│       ├── GET  /companies/<id>/vendor-performance
│       ├── POST /companies/<id>/vendor-performance/generate-scorecards [AI]
│       └── GET  /companies/<id>/vendor-compliance-check
│
├── ai/
│   └── insights.py                      — Claude API service
│       ├── generate_ai_insights()       — Generic HR analytics
│       ├── generate_jd()                — AI Job Description generator
│       ├── analyze_attrition_risk()     — Position flight risk
│       ├── validate_invoice_ai()        — Cross-check billing vs attendance
│       ├── detect_ghost_workers()       — Attendance fraud detection
│       ├── score_vendor_performance()   — Monthly scorecard generation
│       └── generate_org_restructure_recommendations()
│
└── utils/
    └── nepal_law.py                     — Labour Act 2074 helpers
        ├── check_cba_required()         — CBA flag (>=10 workers)
        ├── check_probation()            — 6-month max + expiry alert
        ├── check_casual_days()          — 7 days/month max
        ├── check_minimum_wage()         — NPR 15,000 validation
        ├── calculate_statutory_benefits()— PF 10%, SSF 3.33%, Gratuity
        ├── check_outsource_compliance() — Sections 52-60 full check
        ├── calculate_overtime()         — 1.5x OT rate
        └── get_leave_entitlement()      — Annual/Sick/Maternity/etc.
```

## Database Structure

```
database/
├── schemas/
│   └── complete_schema.sql              — MASTER SCHEMA (1,361 lines)
│       ├── SECTION 1:  group_companies
│       ├── SECTION 2:  companies + company_legal_documents
│       ├── SECTION 3:  branches
│       ├── SECTION 4:  business_units
│       ├── SECTION 5:  cost_centers + departments
│       ├── SECTION 6:  sections + units
│       ├── SECTION 7:  teams (Nepal law CBA/Safety auto-flags)
│       ├── SECTION 8:  work_locations
│       ├── SECTION 9:  employment_categories (11 types seeded)
│       ├── SECTION 10: job_families + grade_levels + designations
│       ├── SECTION 11: reporting_relationships
│       ├── SECTION 12: org_chart_nodes (LTREE path)
│       ├── SECTION 13: positions
│       ├── SECTION 14: employment_type_configs (insource)
│       ├── SECTION 15: outsource_vendors (MoLESS license enforcement)
│       ├── SECTION 16: sla_contracts + sla_kpi_results
│       ├── SECTION 17: vendor_employees (co-employment safeguards)
│       ├── SECTION 18: vendor_invoices (AI discrepancy auto-flag)
│       ├── SECTION 19: vendor_attendance (ghost worker risk)
│       ├── SECTION 20: vendor_performance_cards
│       ├── SECTION 21: 45+ Performance Indexes
│       ├── SECTION 22: 6 Triggers (updated_at, CBA, invoice, headcount, vacancies, law guard)
│       ├── SECTION 23: Seed data (11 employment categories)
│       └── SECTION 24: 5 Views
│           ├── v_department_summary
│           ├── v_grade_salary_matrix
│           ├── v_vendor_compliance_dashboard
│           ├── v_invoice_reconciliation
│           └── v_nepal_la2074_compliance
│
├── seeds/
│   ├── 01_employment_categories.sql     — fn_seed_company_emp_categories()
│   └── 02_grade_levels_sample.sql       — Sample 9-grade structure
│
└── migrations/
    └── 001_initial.py                   — Alembic initial migration
```

## Module Coverage (from Excel)

| Module | Model File | Route File | Schema Section |
|--------|-----------|------------|---------------|
| Company Profile | org_models.py:Company | org_routes.py | Section 2 |
| Company Setup | org_models.py:Company | org_routes.py:/setup-wizard | Section 2 |
| Group Company | org_models.py:GroupCompany | org_routes.py | Section 1 |
| Branch & Location | org_models.py:Branch | org_routes.py | Section 3 |
| Business Unit | org_models.py:BusinessUnit | org_routes.py | Section 4 |
| Department Setup | org_models.py:Department | org_routes.py | Section 5 |
| Section & Unit | org_models.py:Section,Unit | org_routes.py | Section 6 |
| Team Setup | org_models.py:Team | org_routes.py + Nepal law | Section 7 |
| Cost Center | org_models.py:CostCenter | org_routes.py | Section 5 |
| Work Location | org_models.py:WorkLocation | org_routes.py | Section 8 |
| Employment Category | structure_models.py:EmploymentCategory | org_routes.py | Section 9 |
| Designation Setup | structure_models.py:Designation | org_routes.py + AI JD | Section 10 |
| Grade & Level | structure_models.py:GradeLevel | org_routes.py | Section 10 |
| Reporting Hierarchy | structure_models.py:ReportingRelationship | org_routes.py + AI risk | Section 11 |
| Organization Chart | structure_models.py:OrgChartNode | org_routes.py | Section 12 |
| Position Management | structure_models.py:Position | org_routes.py | Section 13 |
| Employment Type - Insource | workforce_config_models.py | workforce_routes.py | Section 14 |
| Employment Type - Outsource | workforce_config_models.py:OutsourceVendor | workforce_routes.py | Section 15 |
| SLA & Contract | workforce_config_models.py:SLAContract | workforce_routes.py | Section 16 |
| Vendor Employees | workforce_config_models.py:VendorEmployee | workforce_routes.py | Section 17 |
| Billing & Invoice | workforce_config_models.py:VendorInvoice | workforce_routes.py + AI | Section 18 |
| Vendor Attendance | workforce_config_models.py:VendorAttendance | workforce_routes.py + AI | Section 19 |
| Vendor Performance | workforce_config_models.py:VendorPerformanceCard | workforce_routes.py + AI | Section 20 |
