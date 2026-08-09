"""
FILE: backend/saas/tenant_provisioner.py
eLogix HRMS — Complete SaaS Tenant Provisioner
Auto-provisions in < 60 seconds:
  PostgreSQL schema · Core tables · Default roles · Permission matrix
  Admin user · MinIO storage folders · Welcome notification
eLogix Technologies · www.elogix.com.np
"""
import os, secrets, string
from datetime import datetime, timezone, timedelta
from ..extensions import db
from ..utils.logging_config import get_logger

logger = get_logger("elogix.provisioner")
_now = lambda: datetime.now(timezone.utc)

CORE_SCHEMA_SQL = """
-- eLogix tenant schema: {schema}
-- Company: {company_name} | Plan: {plan} | Provisioned: {ts}
CREATE SCHEMA IF NOT EXISTS {schema};
SET search_path = {schema}, public;

CREATE TABLE IF NOT EXISTS company_config (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    emp_id VARCHAR(30) UNIQUE,
    full_name VARCHAR(200) NOT NULL,
    email VARCHAR(200),
    phone VARCHAR(30),
    department_id INTEGER,
    designation VARCHAR(100),
    shift VARCHAR(50) DEFAULT 'Day',
    employment_type VARCHAR(50) DEFAULT 'Permanent',
    date_of_join DATE,
    salary_basic NUMERIC(12,2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(20),
    parent_id INTEGER REFERENCES departments(id),
    head_emp_id INTEGER REFERENCES employees(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emp_dept ON employees(department_id);
CREATE INDEX IF NOT EXISTS idx_emp_active ON employees(is_active);
"""

SEED_CONFIG_SQL = """
SET search_path = {schema}, public;
INSERT INTO company_config VALUES
    ('company_name',       '{company_name}'),
    ('brand',              'eLogix'),
    ('tenant_slug',        '{slug}'),
    ('plan',               '{plan}'),
    ('max_employees',      '{max_employees}'),
    ('currency',           '{currency}'),
    ('timezone',           'Asia/Kathmandu'),
    ('labour_law',         'Nepal Labour Act 2074'),
    ('annual_leave_days',  '18'),
    ('sick_leave_days',    '12'),
    ('festival_leave_days','13'),
    ('maternity_leave_days','98'),
    ('ssf_employee_rate',  '11'),
    ('ssf_employer_rate',  '20'),
    ('cit_rate',           '25'),
    ('min_wage_npr',       '15000'),
    ('elogix_version',     '2.0.0'),
    ('provisioned_at',     '{ts}'),
    ('portal_url',         'https://{slug}.elogix.com.np')
ON CONFLICT (key) DO NOTHING;
"""

DEFAULT_ROLES = [
    {"name":"Super Admin",     "slug":"super_admin",     "level":1,  "system":True},
    {"name":"Executive",       "slug":"executive",        "level":2,  "system":True},
    {"name":"HR Manager",      "slug":"hr_manager",       "level":3,  "system":True},
    {"name":"Payroll Officer", "slug":"payroll_officer",  "level":3,  "system":True},
    {"name":"HOD",             "slug":"hod",              "level":4,  "system":True},
    {"name":"HR Officer",      "slug":"hr_officer",       "level":4,  "system":True},
    {"name":"Department Head", "slug":"department_head",  "level":4,  "system":True},
    {"name":"Branch Manager",  "slug":"branch_manager",   "level":4,  "system":True},
    {"name":"Finance Officer", "slug":"finance_officer",  "level":5,  "system":True},
    {"name":"Recruiter",       "slug":"recruiter",        "level":5,  "system":True},
    {"name":"Team Lead",       "slug":"team_lead",        "level":5,  "system":True},
    {"name":"Supervisor",      "slug":"supervisor",       "level":6,  "system":True},
    {"name":"Manager",         "slug":"manager",          "level":6,  "system":True},
    {"name":"Employee",        "slug":"employee",         "level":10, "system":True},
]

# Super admin gets full access; employee gets self-only
SUPER_ADMIN_PERMS = {m: {"view":True,"create":True,"edit":True,"delete":True,"approve":True,"export":True,"scope":"all"}
    for m in ["employees","attendance","leave","payroll","recruitment","performance","training",
              "documents","reports","settings","compliance","vendors","assets","helpdesk","org_chart","ai_tools"]}
EMPLOYEE_PERMS = {m: {"view":True,"create":False,"edit":False,"delete":False,"approve":False,"export":False,"scope":"self_only"}
    for m in ["attendance","leave","payroll","documents","training"]}


class TenantProvisioner:

    @staticmethod
    def _slug_to_schema(slug: str) -> str:
        return "elogix_" + slug.lower().replace("-", "_").replace(" ", "_")

    @staticmethod
    def _temp_password(n=14) -> str:
        chars = string.ascii_letters + string.digits + "!@#$"
        return "".join(secrets.choice(chars) for _ in range(n))

    @classmethod
    def provision(cls, tenant_slug: str, company_name: str, admin_email: str,
                  plan: str, plan_config: dict, country: str="Nepal", currency: str="NPR",
                  industry: str="", phone: str="", admin_name: str="Admin",
                  admin_password: str=None, account_manager: str="",
                  sales_rep: str="") -> dict:
        """
        Full eLogix tenant provisioning — atomic, rolls back on failure.
        """
        from ..saas.models import (Company, CompanyUser, CompanyRole,
                                    ModulePermission, Subscription, Notification, ELOGIX_PLANS)

        schema   = cls._slug_to_schema(tenant_slug)
        ts       = _now().isoformat()
        slug     = tenant_slug.lower().strip()
        logger.info(f"eLogix: Provisioning '{slug}' → schema '{schema}'")

        # Check slug unique
        if db.session.query(Company).filter_by(slug=slug).first():
            raise ValueError(f"'{slug}.elogix.com.np' is already taken. Choose another.")

        try:
            # 1. Create PostgreSQL schema + core tables
            db.session.execute(db.text(
                CORE_SCHEMA_SQL.format(schema=schema, company_name=company_name.replace("'","''"), plan=plan, ts=ts)
            ))

            # 2. Seed company config (Labour Act 2074 defaults)
            db.session.execute(db.text(SEED_CONFIG_SQL.format(
                schema=schema, company_name=company_name.replace("'","''"),
                slug=slug, plan=plan, max_employees=plan_config.get("max_emp",50),
                currency=currency, ts=ts
            )))

            # 3. Create company master record
            trial_end = (_now() + timedelta(days=plan_config.get("days",14))
                         if plan_config.get("days",0) > 0 else None)
            company = Company(
                name            = company_name,
                slug            = slug,
                schema_name     = schema,
                storage_prefix  = f"tenant_{slug}",
                industry        = industry,
                country         = country,
                currency        = currency,
                phone           = phone,
                plan            = plan,
                max_employees   = plan_config.get("max_emp", 50),
                max_storage_gb  = plan_config.get("storage_gb", 5),
                trial_ends_at   = trial_end,
                plan_started_at = _now(),
                status          = "trial" if plan == "trial" else "active",
                account_manager = account_manager,
                sales_rep       = sales_rep,
                encryption_key  = secrets.token_hex(32),
            )
            db.session.add(company)
            db.session.flush()  # get company.id

            # 4. Create subscription record
            sub = Subscription(
                company_id   = company.id,
                plan         = plan,
                status       = "active",
                max_employees= plan_config.get("max_emp", 50),
                storage_gb   = plan_config.get("storage_gb", 5),
                ai_req_limit = plan_config.get("ai_req", 50),
                price_npr    = plan_config.get("price_npr", 0),
                trial_ends_at= trial_end,
            )
            db.session.add(sub)

            # 5. Create default roles
            role_map = {}
            for r in DEFAULT_ROLES:
                role = CompanyRole(
                    company_id  = company.id,
                    name        = r["name"],
                    slug        = r["slug"],
                    level       = r["level"],
                    is_system   = r["system"],
                )
                db.session.add(role)
                db.session.flush()
                role_map[r["slug"]] = role.id

            # 6. Set default permissions
            for module, actions in SUPER_ADMIN_PERMS.items():
                db.session.add(ModulePermission(
                    company_id=company.id, role_id=role_map["super_admin"],
                    module=module, **{f"can_{k}" if k!="scope" else k: v for k,v in actions.items()}
                ))
            for module, actions in EMPLOYEE_PERMS.items():
                db.session.add(ModulePermission(
                    company_id=company.id, role_id=role_map["employee"],
                    module=module, **{f"can_{k}" if k!="scope" else k: v for k,v in actions.items()}
                ))

            # 7. Create admin user
            temp_pw = admin_password or cls._temp_password()
            admin = CompanyUser(
                company_id    = company.id,
                full_name     = admin_name,
                email         = admin_email.lower().strip(),
                role_id       = role_map["super_admin"],
                role_slug     = "super_admin",
                level         = 1,
                is_active     = True,
                is_verified   = False,
                must_change_pw= admin_password is None,
                created_by    = "elogix_provisioner",
            )
            admin.set_password(temp_pw)
            db.session.add(admin)

            # 8. Welcome notification
            db.session.add(Notification(
                company_id = company.id,
                type       = "alert",
                priority   = "high",
                title      = f"🎉 Welcome to eLogix HRMS!",
                message    = (f"Your eLogix account is ready. Portal: https://{slug}.elogix.com.np  "
                              f"Plan: {plan.title()} · Employees: {plan_config.get('max_emp',50)}  "
                              f"Support: support@elogix.com.np · www.elogix.com.np"),
                sent_at    = _now(),
            ))

            db.session.commit()
            logger.info(f"eLogix: '{slug}' provisioned ✅ ({len(DEFAULT_ROLES)} roles, schema: {schema})")

            # 9. MinIO storage
            cls._setup_storage(slug)

            # 10. Send welcome email
            cls._send_welcome_email(admin_email, admin_name, company_name, slug, temp_pw)

            return {
                "tenant_slug":    slug,
                "schema":         schema,
                "company_id":     company.id,
                "company_name":   company_name,
                "portal_url":     f"https://{slug}.elogix.com.np",
                "admin_email":    admin_email,
                "temp_password":  temp_pw if not admin_password else "***",
                "plan":           plan,
                "max_employees":  plan_config.get("max_emp"),
                "roles_created":  len(DEFAULT_ROLES),
                "provisioned_at": ts,
                "note":           "Admin must change password on first login" if not admin_password else "",
            }

        except Exception as e:
            db.session.rollback()
            logger.error(f"eLogix: Provisioning failed for '{slug}': {e}")
            raise

    @staticmethod
    def _setup_storage(tenant_slug: str):
        try:
            from ..services.storage_service import StorageService
            StorageService.ensure_tenant_prefix(tenant_slug)
        except Exception as e:
            logger.warning(f"eLogix Storage: setup warning for '{tenant_slug}': {e}")

    @staticmethod
    def _send_welcome_email(email, name, company, slug, temp_pw):
        try:
            from ..services.email_service import EmailService
            portal = f"https://{slug}.elogix.com.np"
            EmailService.send_welcome(
                to_email=email, to_name=name, portal_url=portal,
                temp_password=temp_pw, company_name=company
            )
        except Exception as e:
            logger.warning(f"eLogix: Welcome email failed: {e}")

    @classmethod
    def deprovision(cls, tenant_slug: str, hard_delete: bool = False):
        from ..saas.models import Company
        company = db.session.query(Company).filter_by(slug=tenant_slug).first()
        if not company:
            raise ValueError(f"Tenant '{tenant_slug}' not found")
        if hard_delete:
            schema = cls._slug_to_schema(tenant_slug)
            db.session.execute(db.text(f"DROP SCHEMA IF EXISTS {schema} CASCADE"))
            db.session.delete(company)
            logger.warning(f"eLogix: '{tenant_slug}' HARD DELETED")
        else:
            company.status = "cancelled"
            logger.info(f"eLogix: '{tenant_slug}' soft-cancelled")
        db.session.commit()
