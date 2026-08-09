"""
FILE: backend/services/tenant_service.py
eLogix HRMS — Tenant isolation service
MOST CRITICAL security file — every DB query must use these helpers.
eLogix Technologies · www.elogix.com.np
"""
from flask import g
from typing import Optional


class TenantService:

    @staticmethod
    def get_current_tenant() -> Optional[str]:
        """Get current eLogix tenant slug from Flask request context."""
        return getattr(g, "tenant_id", None)

    @staticmethod
    def get_current_company_id() -> Optional[str]:
        """Alias — used by legacy routes."""
        return getattr(g, "company_id", None)

    @staticmethod
    def assert_access(resource_company_id):
        """
        Raise PermissionError if current user tries to access
        another eLogix tenant's data.
        """
        current = getattr(g, "company_id", None)
        if current is None:
            raise PermissionError("eLogix: No tenant context — authenticate first")
        if str(resource_company_id) != str(current):
            raise PermissionError(
                f"eLogix Access Denied: tenant '{current}' cannot access tenant '{resource_company_id}' data"
            )

    @staticmethod
    def filter_query(query, model):
        """Auto-apply company_id filter to any SQLAlchemy query."""
        company_id = getattr(g, "company_id", None)
        if company_id and hasattr(model, "company_id"):
            return query.filter(model.company_id == company_id)
        return query

    @staticmethod
    def inject_company(data: dict) -> dict:
        """Inject company_id into data dict before DB insert."""
        company_id = getattr(g, "company_id", None)
        if company_id:
            data["company_id"] = company_id
        return data

    @staticmethod
    def get_tenant_config(tenant_slug: str = None) -> dict:
        """
        Return eLogix tenant-specific configuration.
        In production: fetched from company_config table in tenant schema.
        """
        from ..extensions import db
        slug = tenant_slug or getattr(g, "tenant_id", None)
        if not slug:
            return TenantService._defaults()
        try:
            schema = f"elogix_{slug.replace('-', '_')}"
            result = db.session.execute(
                db.text(f"SELECT key, value FROM {schema}.company_config")
            ).fetchall()
            config = {row[0]: row[1] for row in result}
            return {
                "company_name":     config.get("company_name", slug),
                "currency":         config.get("currency", "NPR"),
                "timezone":         config.get("timezone", "Asia/Kathmandu"),
                "labour_law":       config.get("labour_law", "Nepal Labour Act 2074"),
                "annual_leave":     int(config.get("annual_leave", 18)),
                "sick_leave":       int(config.get("sick_leave", 12)),
                "festival_leave":   int(config.get("festival_leave", 13)),
                "ssf_employee":     float(config.get("ssf_employee_rate", 11)) / 100,
                "ssf_employer":     float(config.get("ssf_employer_rate", 20)) / 100,
                "plan":             config.get("plan", "starter"),
                "max_employees":    int(config.get("max_employees", 50)),
                "elogix_version":   config.get("elogix_version", "2.0.0"),
                "brand":            "eLogix",
            }
        except Exception:
            return TenantService._defaults()

    @staticmethod
    def _defaults() -> dict:
        return {
            "currency":       "NPR",
            "timezone":       "Asia/Kathmandu",
            "annual_leave":   18,
            "sick_leave":     12,
            "festival_leave": 13,
            "ssf_employee":   0.11,
            "ssf_employer":   0.20,
            "max_employees":  50,
            "brand":          "eLogix",
        }
