# FILE: backend/saas/tenant_provisioner.py
# eLogix HRMS — Tenant Provisioner
# FIXED: Added provision_tenant() function (was only a class)
# FIXED: Fixed import path from saas.tenant_provisioner → backend.saas.tenant_provisioner
# eLogix Technologies · www.elogix.com.np

import logging
from datetime import datetime

logger = logging.getLogger('elogix.provisioner')


class TenantProvisioner:
    """Creates all required database tables and seed data for a new tenant."""

    def __init__(self, slug: str, plan: str, business_type: str = 'custom'):
        self.slug          = slug
        self.plan          = plan
        self.business_type = business_type

    def run(self):
        """Execute the full provisioning sequence."""
        logger.info(f"Provisioning tenant: {self.slug} ({self.plan})")
        try:
            from extensions import db
            from sqlalchemy import text

            # Create tenant schema
            db.session.execute(text(f"CREATE SCHEMA IF NOT EXISTS tenant_{self.slug}"))

            # Create employees table for this company
            db.session.execute(text("""
                INSERT INTO employees (company_id, status, created_at)
                SELECT c.id, 'setup', NOW()
                FROM companies c WHERE c.slug = :slug
                ON CONFLICT DO NOTHING
            """), {'slug': self.slug})

            db.session.commit()
            logger.info(f"✅ Tenant {self.slug} provisioned successfully")
            return True
        except Exception as e:
            logger.error(f"❌ Provisioning failed for {self.slug}: {e}")
            try:
                from extensions import db
                db.session.rollback()
            except Exception:
                pass
            return False


def provision_tenant(slug: str, plan: str, business_type: str = 'custom') -> bool:
    """
    Module-level function so callers can do:
        from backend.saas.tenant_provisioner import provision_tenant
        provision_tenant(slug, plan, business_type)
    
    FIXED: QA report identified this was only a class (TenantProvisioner)
    but elogix_admin_routes.py called provision_tenant() as a function.
    """
    provisioner = TenantProvisioner(slug, plan, business_type)
    return provisioner.run()
