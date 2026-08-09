# eLogix HRMS — SaaS Security Architecture
## Tenant Isolation — 4 Layers (ALL already implemented)

### Layer 1: PostgreSQL Row Level Security (Database)
File: database/saas_schema.sql
```sql
CREATE POLICY company_isolation ON company_users
    USING (company_id::text = current_setting('app.company_id', TRUE));
```
Even if backend code has a bug, the DB blocks cross-tenant queries.

### Layer 2: company_id on every API query (Backend)
File: backend/middleware/tenant.py + backend/services/tenant_service.py
Every Flask route filters: `query.filter_by(company_id=g.company_id)`
g.company_id comes from the verified JWT — cannot be spoofed.

### Layer 3: JWT carries tenant identity (Auth)
File: backend/services/auth_service.py
JWT payload: { company_id, tenant_slug, role, level, permissions, jti }
Every request verifies: token signature → jti not blacklisted → company active

### Layer 4: Frontend scopes all API calls (Frontend)
File: src/utils/api.js
Every fetch() adds: X-Tenant-Id: {slug} header
Backend verifies header matches JWT company — mismatch = 403

## What tenant users CANNOT do:
- Query another tenant's employees (blocked by company_id filter + RLS)  
- See another tenant's payroll (blocked at DB level)
- Access another tenant's files (MinIO: tenant_{slug}/ prefix isolation)
- Impersonate another company (JWT company_id is fixed at login)
- See other companies in the system (no company list endpoint for tenants)

## What eLogix SuperAdmin CAN do (separate token):
- View all companies (own Admin Panel only)
- Suspend/activate companies
- Generate invoices
- Broadcast notifications
- View audit logs across companies
