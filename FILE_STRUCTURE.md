# eLogix HRMS — Complete File Structure (Updated)
**Version 1.0.0** | React 18 + Vite + Flask + PostgreSQL | **71,107+ lines, 239 files**

---

## QUICK START
```bash
# Frontend
npm install && npm run dev          # localhost:5173

# Backend
pip install -r backend/config/requirements.txt
cp .env.example .env                # fill in keys
python run.py                       # localhost:5000

# Database
psql $DATABASE_URL < database/schemas/complete_schema.sql
psql $DATABASE_URL < database/seeds/04_demo_company_data.sql
alembic stamp head                  # mark initial migration
```

---

## ROOT FILES
```
.env                    # Environment variables (DATABASE_URL, ANTHROPIC_API_KEY, JWT keys)
.env.example            # Template (commit this, not .env)
.gitignore
alembic.ini             # DB migration config
index.html              # Vite HTML entry
package.json            # Node dependencies
run.py                  # Flask entry: python run.py
tailwind.config.js
vite.config.js
COMPLIANCE_GUIDELINES.md
FILE_STRUCTURE.md       # This file
HR_POLICY_SYSTEM_README.md
```

---

## ALEMBIC/
```
alembic/
  env.py                # Migration environment, imports all models
  README                # Migration commands
  versions/             # Auto-generated migration files
```

---

## BACKEND/ (18 Blueprints, 54 files)
```
backend/
  __init__.py
  app.py                # Flask create_app() factory, registers all 18 blueprints
  database.py           # db_session shim for legacy imports
  extensions.py         # Shared db = SQLAlchemy()
  BACKEND_FILE_MAP.md   # Full API endpoint map

  ai/
    insights.py         # Claude API: JD gen, attrition risk, invoice validation,
                        # ghost worker detection, vendor scoring, org restructure

  config/
    database.py         # Engine, session factory, Nepal TZ, health check
    requirements.txt    # Python deps (Flask, SQLAlchemy, Anthropic, psycopg2...)
    settings.py         # Dev/Prod/Test config classes

  hr_policies/
    policy_templates.py # 30+ Nepal-compliant HR policy templates

  middleware/
    auth.py             # JWT + 7-persona RBAC decorators
    tenant.py           # Multi-tenant isolation

  models/ (15 model files)
    __init__.py                    # Imports all models for db.create_all()
    company_setup_models.py        # (legacy)
    dept_team_models.py            # (legacy)
    employee_models.py             # Employee, PolicyAcknowledgement, PolicyAuditLog
    employment_category_models.py  # (legacy)
    group_branch_models.py         # (legacy)
    hr_policy_models.py            # HRPolicy, PolicySection
    org_models.py                  # CANONICAL: GroupCompany, Company, Branch, BU,
                                   #   Department, Section, Unit, Team, CostCenter, WorkLocation
    org_setup_models.py            # (legacy)
    org_structure_models.py        # (legacy)
    position_management_models.py  # (legacy)
    shift_holiday_models.py        # ShiftType, HolidayCalendar, WeekendPolicy
    structure_hierarchy_models.py  # (legacy)
    structure_models.py            # CANONICAL: EmploymentCategory, JobFamily, GradeLevel,
                                   #   Designation, ReportingRelationship, OrgChartNode, Position
    workforce_config_models.py     # CANONICAL: OutsourceVendor, SLAContract, VendorEmployee,
                                   #   VendorInvoice, VendorAttendance, VendorPerformanceCard

  routes/ (18 blueprints)
    __init__.py                    # ALL_BLUEPRINTS list
    auth_routes.py                 # /api/v1/auth
    business_unit_routes.py        # /api/v1/business-units
    company_setup_routes.py        # /api/v1/company
    dept_team_routes.py            # /api/v1/dept
    employment_category_routes.py  # /api/v1/employment-categories
    excel_voice_routes.py          # /api/v1/tools
    hr_policy_routes.py            # /api/v1/hr-policies
    org_routes.py                  # /api/v1/org
    org_setup_routes.py            # /api/v1/org-setup (legacy)
    org_structure_routes.py        # /api/v1/org (legacy)
    sla_invoice_routes.py          # /api/v1/sla
    structure_routes.py            # /api/v1/structure
    vendor_employee_routes.py      # /api/v1/ve  ← 5 modules: employees, assets, leave, advance, attendance
    vendor_finance_routes.py       # /api/v1/vf  ← 5 modules: billing, invoices, performance, clearance, reports
    vendor_routes.py               # /api/v1/vendors
    workforce_config_routes.py     # /api/v1/wfconfig
    workforce_planning_routes.py   # /api/v1/wfp ← 13 modules: quota, headcount, vacancy...
    workforce_routes.py            # /api/v1/workforce

  utils/
    ai_context.py      # AI prompt builders
    excel_import.py    # SAP-style Excel import, 11 module templates
    nepal_law.py       # LA2074 helpers: CBA, wage check, outsource compliance
    notifications.py   # Email/in-app notifications
    pagination.py      # paginate(), success(), error() helpers
    voice_input.py     # Whisper API transcription
```

---

## DATABASE/ (26 files)
```
database/
  migrations/
    001_initial.py     # Complete migration: 26 tables in FK order
    002_add_indexes.py # Performance indexes
    003_add_triggers.py # Nepal LA2074 DB-level triggers

  schemas/ (21 SQL files — use complete_schema.sql for setup)
    complete_schema.sql            # ← MASTER: all tables, indexes, triggers, views
    master_schema.sql              # Alternative master
    branch_location_schema.sql
    business_unit_schema.sql
    company_setup_schema.sql
    dept_team_schema.sql
    employment_category_schema.sql
    group_company_schema.sql
    hr_policies_schema.sql
    org_setup_schema.sql
    org_structure_schema.sql
    position_management_schema.sql
    structure_schema.sql
    vendor_employee_schema.sql     # VE employees, assets, leave, cash advance, attendance
    vendor_finance_schema.sql      # Billing records, invoice OCR, clearances
    vendor_management_schema.sql   # Agencies, BGV, agreements, SLA
    workforce_config_schema.sql    # Shift types, holiday calendar, weekend policies
    workforce_planning_schema.sql  # Workforce plans, KPIs, quota analysis views
    workforce_schema.sql           # Outsource vendors, SLA, invoices

  seeds/
    01_employment_categories.sql   # 13 LA2074 employment types
    02_grade_levels_sample.sql     # 9-grade salary bands
    03_nepal_provinces_districts.sql # 7 provinces, 77 districts
    04_demo_company_data.sql       # Demo company with sample data
```

---

## SRC/ (Frontend — 135 files, 34,790 lines)
```
src/
  App.jsx             # Root: 80 routes, AppContext, navTo(), useApp()
  index.css           # Tailwind base + globals
  main.jsx            # React DOM entry

  components/
    dashboard/        # 7 persona dashboards
      SuperAdminDashboard.jsx
      ExecutiveDashboard.jsx
      HRManagerDashboard.jsx
      DepartmentDashboard.jsx
      BranchDashboard.jsx
      EmployeeDashboard.jsx
      RecruitmentDashboard.jsx

      snapshots/      # 74 page components
        DeptSetupShared.jsx          # SHARED: Field, ExcelModal, PageHeader, Drawer,
                                     #   SearchBar, Badge, LuxCard, ContextMenu, AIImpact

        ── ORGANIZATION SETUP ──
        GroupCompanyPage.jsx
        CompanyProfilePage.jsx
        CompanySetupPage.jsx
        BranchLocationPage.jsx
        BusinessUnitPage.jsx

        ── DEPT & TEAM ──
        DeptSetupPage.jsx / DeptTeamSetupPage.jsx
        SectionUnitPage.jsx / TeamSetupPage.jsx
        CostCenterPage.jsx / WorkLocationPage.jsx

        ── STRUCTURE ──
        EmploymentCategoryPage.jsx   GradeLevelPage.jsx
        DesignationSetupPage.jsx     ReportingHierarchyPage.jsx
        OrgChartPage.jsx             ProcessFlowPage.jsx
        PositionManagementPage.jsx

        ── EMPLOYMENT TYPE / OUTSOURCE ──
        EmploymentTypePage.jsx       OutsourceSLAPage.jsx
        OutsourceEmployeesPage.jsx   OutsourceBillingPage.jsx
        OutsourceAttendancePage.jsx  OutsourcePerformancePage.jsx

        ── WORKFORCE CONFIGURATION ──
        VendorOutsourceMappingPage.jsx
        ShiftSetupPage.jsx           HolidayCalendarPage.jsx
        WeekendPolicyPage.jsx

        ── VENDOR / OUTSOURCE MANAGEMENT ──
        RecruitmentAgencyPage.jsx    VendorBGVPage.jsx
        VendorListingPage.jsx        VendorAgreementPage.jsx
        VendorSLAPage.jsx

        ── VENDOR EMPLOYEE MANAGEMENT ──
        VendorEmployeesPage.jsx      VendorAssetsPage.jsx
        VendorLeaveRequestsPage.jsx  VendorCashAdvancePage.jsx
        VendorAttendancePage.jsx

        ── VENDOR FINANCE & ANALYTICS ──
        VendorBillingPage.jsx        VendorInvoicePage.jsx
        VendorPerformancePage.jsx    VendorClearancePage.jsx
        VendorReportsPage.jsx

        ── WORKFORCE PLANNING (13 pages) ──
        StaffQuotaDarbadiPage.jsx    CurrentStatusPage.jsx
        LocationDeptPage.jsx         AnnualManpowerPage.jsx
        QuarterlyReviewPage.jsx      MonthlyReviewPage.jsx
        HeadcountPlanPage.jsx        VacancyPlanPage.jsx
        ReplacementPlanPage.jsx      ExpansionPlanPage.jsx
        ContractStaffPlanPage.jsx    ProductivityPlanPage.jsx
        ResourceAllocationPage.jsx

        ── SNAPSHOTS / ANALYTICS ──
        AttendanceSnapshot.jsx       LeaveSnapshot.jsx
        PayrollSnapshot.jsx          RecruitmentSnapshot.jsx
        PerformanceSnapshot.jsx      EngagementSnapshot.jsx
        AIInsightsPage.jsx           NotificationsPage.jsx
        HRPoliciesPage.jsx

    layout/
      Sidebar.jsx   Topbar.jsx   Breadcrumb.jsx

    modals/
      AIAssistantModal.jsx   LanguageCurrencyModal.jsx   NotificationPanel.jsx

    shared/
      AIInsightCard.jsx  Card.jsx      DataTable.jsx   EmptyState.jsx
      MetricRow.jsx       Modal.jsx     PageTitle.jsx   Pill.jsx
      ProgressBar.jsx     StatCard.jsx  TaskItem.jsx

  context/
    AppContext.jsx      # Re-exports from App.jsx (AppContext, useApp)
    AuthContext.jsx     # Auth state, JWT management, login/logout
    ThemeContext.jsx    # Dark/light mode

  data/
    currencies.js       # 50 currencies
    languages.js        # 20 languages
    mockData.js         # Dev mock data
    personas.js         # 7 persona definitions
    sidebarMenu.js      # Complete sidebar (451 IDs, 720 lines)
    wfpData.js          # Workforce Planning shared data (depts, branches, positions, trends)

  hooks/
    useApp.js           # Re-exports useApp from App.jsx
    useAuth.js          # Auth hook (wraps AuthContext)
    useCurrency.js      # NPR/multi-currency formatting
    useTranslation.js   # i18n hook (en/ne/hi + 17 more)

  i18n/
    index.js            # i18n initializer
    translations.js     # Translation loader
    locales/            # 20 JSON files: en ne hi ar zh fr de es pt ja ko id ms th vi tr ru ur sw bn

  utils/
    api.js              # Complete API client — 30+ typed helpers:
                        #   authApi, groupApi, companyApi, branchApi, buApi,
                        #   deptApi, sectionApi, teamApi, costCenterApi,
                        #   empCategoryApi, gradeApi, designationApi, positionApi,
                        #   orgChartApi, reportingApi, vendorApi, slaApi, invoiceApi,
                        #   vendorAttendanceApi, vendorPerfApi, shiftApi, holidayApi,
                        #   weekendPolicyApi, excelApi, voiceApi,
                        #   veEmployeeApi, veAssetsApi, veLeaveApi, veAdvanceApi, veAttendanceApi,
                        #   vfBillingApi, vfInvoiceApi, vfPerformanceApi, vfClearanceApi, vfReportsApi,
                        #   wfpApi
    constants.js        # Nepal LA2074 values, all enums, provinces, labour offices
    currency.js         # NPR formatting
    dateUtils.js        # BS/AD date conversion
    exportUtils.js      # Excel/PDF/CSV helpers
    rbac.js             # Role-based access control

  main.jsx              # React DOM entry point
  index.css             # Tailwind base + Nepal font support
```

---

## LEGAL-DOCS/ (9 files)
```
legal-docs/
  00_INDEX.md
  01_PRIVACY_POLICY.md
  02_TERMS_OF_SERVICE.md
  03_DPA_NDA_EULA_AUP.md
  04_SLA_RETENTION_INCIDENT_SUBPROCESSOR_COOKIE_AI.md
  08_DATA_RETENTION_POLICY.md
  09_INCIDENT_RESPONSE_PLAN.md
  10_11_SUBPROCESSOR_COOKIE_POLICY.md
  12_AI_TRANSPARENCY_STATEMENT.md
```

---

## API ENDPOINT SUMMARY (18 Blueprints)

| Blueprint | Prefix | Modules |
|-----------|--------|---------|
| auth_bp | /api/v1/auth | login, refresh, logout, me, roles |
| company_bp | /api/v1/company | Company setup wizard |
| org_bp | /api/v1/org | Group companies, companies, branches, depts, positions, org-chart |
| bu_bp | /api/v1/business-units | Full CRUD + AI insight |
| dept_bp | /api/v1/dept | Departments, sections, units, teams, cost-centers, work-locations |
| struct_bp | /api/v1/structure | Employment categories, job families, grade levels, designations+AI JD |
| ec_bp | /api/v1/employment-categories | 13 LA2074 types |
| vendor_bp | /api/v1/vendors | Agencies, BGV, listing, agreements, SLA |
| sla_bp | /api/v1/sla | SLA contracts, invoices, attendance, ghost scan, performance |
| wf_bp | /api/v1/workforce | Workforce management |
| wfc_bp | /api/v1/wfconfig | Vendor mapping, shifts, holidays, weekend policies |
| ve_bp | /api/v1/ve | Vendor employees, assets, leave, advance, attendance |
| vf_bp | /api/v1/vf | Billing, invoices, performance, clearance, reports |
| wfp_bp | /api/v1/wfp | Quota, headcount, vacancy, replacement, expansion, productivity, resource |
| policy_bp | /api/v1/hr-policies | 30+ policy types |
| tools_bp | /api/v1/tools | Excel import/export, voice transcription |

---

## NEPAL LABOUR ACT 2074 — ENFORCEMENT LAYERS

| Layer | What's enforced |
|-------|----------------|
| **Database** | CHECK: min_wage >= 15000, probation <= 6 months, casual days <= 7/month, night shift premium, min 1 rest day/week, system_access = FALSE for vendor workers |
| **SQLAlchemy** | Event listeners on ShiftType, WeekendPolicy, VendorEmployee raise ValueError before save |
| **Flask API** | 422 with specific LA2074 section reference on violations |
| **Frontend** | Real-time warnings, Nepal law banners on all relevant pages |

---

## WHAT'S BUILT vs WHAT'S ROADMAP

### ✅ BUILT (80 routes, 74 pages)
- Organization Management (all modules)
- Vendor / Outsource Management (all modules)
- Workforce Configuration (all modules)
- Workforce Planning (13 pages)

### 🗓 ROADMAP (372 sidebar IDs awaiting implementation)
- Recruitment & ATS (manpower requisition → job posting → interviews → offers)
- Onboarding & Probation (document collection → joining → probation tracking)
- Employee Lifecycle (directory → profiles → transfers → exits)
- Attendance Management (biometric → GPS → live tracking → reports)
- Leave Management (policies → requests → calendar → analytics)
- Payroll (salary structures → processing → tax → payslips)
- Performance & Talent (KRA/KPI/OKR → appraisal → succession)
- Training & Development (L&D calendar → LMS → certifications)
- Employee Experience (engagement → wellness → DEI)
- Finance & Assets (budget → inventory → expense claims)
- Compliance & Risk (statutory → audits → legal)
- Reports & Analytics (BI dashboard → custom reports)
- System Admin (users → roles → workflows → integrations)
