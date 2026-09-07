# FILE: backend/app.py
# eLogix HRMS — Main Flask Application
# FIXED: db.init_app(app) — db now imported from extensions.py
# FIXED: migrate imported from extensions (not config.database)
# FIXED: removed broken comment-code mix that caused import failure
# eLogix Technologies · www.elogix.com.np

import os
import logging
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
)
logger = logging.getLogger('elogix')


def create_app(config_name=None):
    """Application factory."""
    app = Flask(__name__, static_folder='../dist', static_url_path='')

    # ── Config ────────────────────────────────────────────────────────
    app.config.update(
        SECRET_KEY                     = os.getenv('SECRET_KEY', 'elogix-dev-secret'),
        SQLALCHEMY_DATABASE_URI        = os.getenv('DATABASE_URL', 'postgresql://elogix_user:elogix_pass@localhost:5432/elogix_hrms'),
        SQLALCHEMY_TRACK_MODIFICATIONS = False,
        SQLALCHEMY_ENGINE_OPTIONS      = {
            'pool_size'    : int(os.getenv('DB_POOL_SIZE', 10)),
            'max_overflow' : int(os.getenv('DB_MAX_OVERFLOW', 20)),
            'pool_recycle' : int(os.getenv('DB_POOL_RECYCLE', 300)),
            'pool_pre_ping': True,
        },
        MAX_CONTENT_LENGTH   = 50 * 1024 * 1024,
        JSON_SORT_KEYS       = False,
        PROPAGATE_EXCEPTIONS = True,
    )

    # ── CORS ──────────────────────────────────────────────────────────
    allowed_origins = os.getenv(
        'CORS_ORIGINS',
        os.getenv('ALLOWED_ORIGINS', 'http://localhost:5173,https://elogix.com.np')
    ).split(',')
    CORS(app,
         origins             = [o.strip() for o in allowed_origins],
         supports_credentials = True,
         methods             = ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
         allow_headers       = ['Content-Type','Authorization','X-Tenant-Slug','X-Request-ID'],
    )

    # ── Extensions (db, cache, limiter) ──────────────────────────────
    # FIX: db must come from extensions.py — it is the shared SQLAlchemy instance
    # app.py previously had: from config.database import db_session, init_schema
    # then immediately called db.init_app(app) — but 'db' was never imported → NameError
    from extensions import db, cache, limiter
    db.init_app(app)
    cache.init_app(app, config={'CACHE_TYPE': 'SimpleCache'})
    limiter.init_app(app)

    # ── Flask-Migrate (Alembic integration) ───────────────────────────
    try:
        from flask_migrate import Migrate
        Migrate(app, db)
    except ImportError:
        logger.warning('flask-migrate not installed — alembic will be used directly')

    # ── Middleware ────────────────────────────────────────────────────
    try:
        from middleware.tenant import TenantMiddleware
        TenantMiddleware(app)
    except ImportError as e:
        logger.warning(f'TenantMiddleware not loaded: {e}')

    try:
        from middleware.rate_limit import setup_rate_limiter
        setup_rate_limiter(app)
    except ImportError:
        pass

    try:
        from middleware.security import setup_security_headers
        setup_security_headers(app)
    except ImportError:
        pass

    # ── Register blueprints ───────────────────────────────────────────
    _register_blueprints(app)

    # ── SPA static file serving ───────────────────────────────────────
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_spa(path):
        dist_dir = os.path.join(app.root_path, '..', 'dist')
        target   = os.path.join(dist_dir, path)
        if path and os.path.exists(target) and os.path.isfile(target):
            return send_from_directory(dist_dir, path)
        return send_from_directory(dist_dir, 'index.html')

    # ── Health check ──────────────────────────────────────────────────
    @app.route('/api/health')
    def health():
        from extensions import db
        db_ok = True
        try:
            from sqlalchemy import text
            db.session.execute(text('SELECT 1'))
        except Exception:
            db_ok = False
        return jsonify({
            'status'     : 'ok',
            'service'    : 'eLogix HRMS API',
            'version'    : os.getenv('PRODUCT_VERSION', '3.0.0'),
            'environment': os.getenv('FLASK_ENV', 'production'),
            'database'   : 'connected' if db_ok else 'unavailable',
        })

    # ── Error handlers ────────────────────────────────────────────────
    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({'error': 'Bad Request', 'message': str(e)}), 400

    @app.errorhandler(401)
    def unauthorized(e):
        return jsonify({'error': 'Unauthorized', 'message': 'Valid token required'}), 401

    @app.errorhandler(403)
    def forbidden(e):
        return jsonify({'error': 'Forbidden', 'message': 'Insufficient permissions'}), 403

    @app.errorhandler(404)
    def not_found(e):
        if request.path.startswith('/api/'):
            return jsonify({'error': 'Not Found'}), 404
        dist_dir = os.path.join(app.root_path, '..', 'dist')
        try:
            return send_from_directory(dist_dir, 'index.html')
        except Exception:
            return jsonify({'error': 'Not Found'}), 404

    @app.errorhandler(413)
    def too_large(e):
        return jsonify({'error': 'File Too Large', 'message': 'Maximum 50 MB allowed'}), 413

    @app.errorhandler(429)
    def rate_limited(e):
        return jsonify({'error': 'Too Many Requests', 'message': 'Rate limit exceeded'}), 429

    @app.errorhandler(500)
    def internal_error(e):
        logger.error(f'Internal error: {e}', exc_info=True)
        return jsonify({'error': 'Internal Server Error'}), 500

    logger.info('✅ eLogix HRMS application created successfully')
    return app


def _register_blueprints(app):
    """Register every blueprint. Import errors are caught individually so one
    missing route file does not prevent the rest of the app from starting."""

    blueprints = [
        # Auth & User
        ('routes.auth_routes',              'auth_bp',              '/api/v1/auth'),
        ('routes.user_access_routes',       'user_access_bp',       '/api/v1/users'),
        ('routes.rbac_routes',              'rbac_bp',              '/api/v1/rbac'),
        ('routes.permission_matrix_routes', 'permission_matrix_bp', '/api/v1/permissions'),
        ('routes.company_users_routes',     'company_users_bp',     '/api/v1/company-users'),
        # SaaS
        ('saas.elogix_admin_routes',        'elogix_admin_bp',      '/api/elogix-admin/v1'),
        ('saas.admin_routes',               'saas_admin_bp',        '/api/saas/v1'),
        # Org
        ('routes.company_setup_routes',     'company_setup_bp',     '/api/v1/company'),
        ('routes.org_setup_routes',         'org_setup_bp',         '/api/v1/org-setup'),
        ('routes.org_structure_routes',     'org_structure_bp',     '/api/v1/org-structure'),
        ('routes.org_routes',               'org_bp',               '/api/v1/org'),
        ('routes.dept_team_routes',         'dept_team_bp',         '/api/v1/departments'),
        ('routes.structure_routes',         'structure_bp',         '/api/v1/structure'),
        ('routes.business_unit_routes',     'business_unit_bp',     '/api/v1/business-units'),
        ('routes.employment_category_routes','employment_category_bp','/api/v1/employment-categories'),
        ('routes.workforce_config_routes',  'workforce_config_bp',  '/api/v1/workforce-config'),
        # Employee
        ('routes.employee_database_routes', 'employee_bp',          '/api/v1/employees'),
        ('routes.employee_joining_routes',  'joining_bp',           '/api/v1/joining'),
        ('routes.employee_enrollment_routes','enrollment_bp',       '/api/v1/enrollment'),
        ('routes.employee_movement_routes', 'movement_bp',          '/api/v1/movement'),
        ('routes.employee_documents_routes','employee_docs_bp',     '/api/v1/employee-docs'),
        ('routes.preboarding_routes',       'preboarding_bp',       '/api/v1/preboarding'),
        ('routes.probation_management_routes','probation_bp',       '/api/v1/probation'),
        ('routes.exit_management_routes',   'exit_bp',              '/api/v1/exit'),
        ('routes.exit_analytics_routes',    'exit_analytics_bp',    '/api/v1/exit-analytics'),
        ('routes.settlement_documents_routes','settlement_bp',      '/api/v1/settlement'),
        # Recruitment
        ('routes.recruitment_routes',       'recruitment_bp',       '/api/v1/recruitment'),
        ('routes.ats_routes',               'ats_bp',               '/api/v1/ats'),
        ('routes.workforce_planning_routes','workforce_planning_bp','/api/v1/workforce-planning'),
        ('routes.employer_branding_routes', 'employer_branding_bp', '/api/v1/employer-branding'),
        # Attendance
        ('routes.attendance_setup_routes',  'attendance_setup_bp',  '/api/v1/attendance-setup'),
        ('routes.daily_attendance_routes',  'daily_attendance_bp',  '/api/v1/attendance'),
        ('routes.attendance_regularization_routes','attendance_reg_bp','/api/v1/attendance-regularization'),
        ('routes.attendance_processing_routes','attendance_proc_bp','/api/v1/attendance-processing'),
        ('routes.attendance_reports_routes','attendance_reports_bp','/api/v1/attendance-reports'),
        ('routes.missed_punch_request_routes','missed_punch_bp',    '/api/v1/missed-punch'),
        ('routes.overtime_monitoring_routes','overtime_bp',         '/api/v1/overtime'),
        ('routes.leave_setup_routes',       'leave_setup_bp',       '/api/v1/leave-setup'),
        ('routes.leave_operations_routes',  'leave_ops_bp',         '/api/v1/leave'),
        ('routes.leave_settlement_routes',  'leave_settlement_bp',  '/api/v1/leave-settlement'),
        ('routes.leave_reports_routes',     'leave_reports_bp',     '/api/v1/leave-reports'),
        ('routes.payroll_setup_routes',     'payroll_setup_bp',     '/api/v1/payroll-setup'),
        ('routes.payroll_processing_routes','payroll_proc_bp',      '/api/v1/payroll'),
        ('routes.payroll_finalization_routes','payroll_fin_bp',     '/api/v1/payroll-finalization'),
        ('routes.payroll_information_routes','payroll_info_bp',     '/api/v1/payroll-info'),
        ('routes.payroll_analytics_routes', 'payroll_analytics_bp', '/api/v1/payroll-analytics'),
        ('routes.salary_tax_routes',        'salary_tax_bp',        '/api/v1/salary-tax'),
        ('routes.wfh_tracking_routes',      'wfh_bp',               '/api/v1/wfh'),
        ('routes.field_visit_tracking_routes','field_visit_bp',     '/api/v1/field-visit'),
        ('routes.insource_outsource_attendance_routes','insource_bp','/api/v1/insource-attendance'),
        # Performance
        ('routes.performance_evaluation_routes','perf_eval_bp',    '/api/v1/performance'),
        ('routes.performance_analytics_dashboard_routes','perf_analytics_bp','/api/v1/performance-analytics'),
        ('routes.performance_analytics_kpi_routes','kpi_analytics_bp','/api/v1/kpi-analytics'),
        ('routes.goal_assignment_routes',   'goal_assign_bp',       '/api/v1/goals'),
        ('routes.goal_tracking_routes',     'goal_track_bp',        '/api/v1/goal-tracking'),
        ('routes.kpi_management_routes',    'kpi_bp',               '/api/v1/kpi'),
        ('routes.kra_management_routes',    'kra_bp',               '/api/v1/kra'),
        ('routes.okr_management_routes',    'okr_bp',               '/api/v1/okr'),
        ('routes.pms_360_routes',           'pms360_bp',            '/api/v1/pms360'),
        ('routes.rewards_recognition_routes','rewards_bp',          '/api/v1/rewards'),
        ('routes.succession_planning_routes','succession_bp',       '/api/v1/succession'),
        ('routes.career_development_routes','career_bp',            '/api/v1/career'),
        ('routes.skill_gap_training_request_routes','skill_gap_bp', '/api/v1/skill-gap'),
        ('routes.training_calendar_routes', 'training_cal_bp',      '/api/v1/training-calendar'),
        ('routes.training_needs_routes',    'training_needs_bp',    '/api/v1/training-needs'),
        ('routes.course_management_lms_routes','lms_bp',            '/api/v1/lms'),
        ('routes.learning_portal_elearning_routes','learning_bp',   '/api/v1/learning'),
        ('routes.training_feedback_roi_assessment_routes','training_roi_bp','/api/v1/training-roi'),
        ('routes.training_participation_reports_routes','training_reports_bp','/api/v1/training-reports'),
        ('routes.certificate_generation_tracking_routes','cert_bp', '/api/v1/certificates'),
        # Experience
        ('routes.employee_engagement_routes','engagement_bp',       '/api/v1/engagement'),
        ('routes.employee_relations_routes','relations_bp',         '/api/v1/relations'),
        ('routes.employee_social_feed_routes','social_feed_bp',     '/api/v1/social-feed'),
        ('routes.wellness_support_routes',  'wellness_bp',          '/api/v1/wellness'),
        ('routes.dei_routes',               'dei_bp',               '/api/v1/dei'),
        # HR Services
        ('routes.hr_helpdesk_routes',       'helpdesk_bp',          '/api/v1/helpdesk'),
        ('routes.ess_self_service_routes',  'ess_bp',               '/api/v1/ess'),
        ('routes.ess_attendance_leave_resignation_routes','ess_att_bp','/api/v1/ess/attendance'),
        ('routes.ess_policies_payroll_routes','ess_pay_bp',         '/api/v1/ess/payroll'),
        ('routes.ess_activity_goals_helpdesk_routes','ess_act_bp',  '/api/v1/ess/activity'),
        ('routes.mss_team_management_routes','mss_bp',              '/api/v1/mss'),
        # Finance
        ('routes.hr_budgeting_routes',      'hr_budget_bp',         '/api/v1/hr-budget'),
        ('routes.asset_inventory_routes',   'asset_bp',             '/api/v1/assets'),
        ('routes.administrative_operations_routes','admin_ops_bp',  '/api/v1/admin-ops'),
        ('routes.finance_claims_routes',    'finance_bp',           '/api/v1/finance'),
        # Compliance
        ('routes.hr_policy_routes',         'hr_policy_bp',         '/api/v1/hr-policies'),
        ('routes.compliance_management_routes','compliance_bp',     '/api/v1/compliance'),
        ('routes.risk_management_routes',   'risk_bp',              '/api/v1/risk'),
        ('routes.legal_management_routes',  'legal_bp',             '/api/v1/legal'),
        # Reports
        ('routes.standard_reports_routes',  'std_reports_bp',       '/api/v1/reports'),
        ('routes.hr_analytics_routes',      'hr_analytics_bp',      '/api/v1/hr-analytics'),
        ('routes.hr_analytics_governance_routes','hr_gov_bp',       '/api/v1/hr-governance'),
        ('routes.advanced_analytics_routes','adv_analytics_bp',     '/api/v1/advanced-analytics'),
        ('routes.workload_analysis_routes', 'workload_bp',          '/api/v1/workload'),
        # AI
        ('routes.ai_chat_routes',           'ai_chat_bp',           '/api/v1/ai/chat'),
        ('routes.ai_proxy_routes',          'ai_proxy_bp',          '/api/v1/ai'),
        ('routes.ai_business_intelligence_routes','ai_bi_bp',       '/api/v1/ai/bi'),
        # System
        ('routes.system_settings_routes',   'system_settings_bp',   '/api/v1/system'),
        ('routes.workflow_automation_routes','workflow_bp',          '/api/v1/workflows'),
        ('routes.integration_api_routes',   'integration_bp',       '/api/v1/integrations'),
        ('routes.integration_hub_routes',   'integration_hub_bp',   '/api/v1/integration-hub'),
        ('routes.mobile_app_config_routes', 'mobile_bp',            '/api/v1/mobile-config'),
        ('routes.data_migration_routes',    'data_migration_bp',    '/api/v1/data-migration'),
        # Vendor
        ('routes.vendor_routes',            'vendor_bp',            '/api/v1/vendors'),
        ('routes.vendor_employee_routes',   'vendor_emp_bp',        '/api/v1/vendor-employees'),
        ('routes.vendor_billing_analytics_routes','vendor_billing_bp','/api/v1/vendor-billing'),
        ('routes.vendor_hr_analytics_routes','vendor_hr_bp',        '/api/v1/vendor-hr'),
        ('routes.vendor_finance_routes',    'vendor_fin_bp',        '/api/v1/vendor-finance'),
        ('routes.sla_invoice_routes',       'sla_bp',               '/api/v1/sla'),
        # Billing
        ('routes.billing_routes',           'billing_bp',           '/api/v1/billing'),
        # QA Fix: Stub endpoints for the 67 missing API addresses
        ('routes.missing_endpoints_routes',  'missing_bp',           '/api/v1'),
        # Letters
        ('routes.government_letters_routes','govt_letters_bp',      '/api/v1/letters'),
        ('routes.excel_voice_routes',       'excel_voice_bp',       '/api/v1/excel-voice'),
        # Workforce
        ('routes.workforce_routes',         'workforce_bp',         '/api/v1/workforce'),
        # Master DB / Recruitment tracking
        ('routes.recruitment_routes',       'recruitment_bp',       '/api/v1/recruitment'),
        ('routes.master_database_routes',   'master_db_bp',         '/api/v1/master-db'),
    ]

    registered = 0
    for module_path, bp_name, prefix in blueprints:
        try:
            import importlib
            mod = importlib.import_module(module_path)
            bp  = getattr(mod, bp_name)
            app.register_blueprint(bp, url_prefix=prefix)
            registered += 1
        except ImportError as e:
            logger.debug(f'Blueprint not found: {module_path}.{bp_name} — {e}')
        except Exception as e:
            logger.error(f'Failed to register {bp_name}: {e}')

    logger.info(f'✅ Registered {registered}/{len(blueprints)} blueprints')


# ── Entry point ───────────────────────────────────────────────────────
app = create_app()

if __name__ == '__main__':
    port  = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_ENV', 'production') == 'development'
    app.run(host='0.0.0.0', port=port, debug=debug)
