"""
FILE: backend/services/auth_service.py
eLogix HRMS — Authentication & Security Service
JWT · bcrypt · MFA · Session management · Token revocation
SECURITY: Zero-trust. Every token carries company_id + role + jti.
eLogix Technologies · www.elogix.com.np
"""
import os, secrets, re, hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional
import jwt, bcrypt

SECRET     = os.getenv("JWT_SECRET_KEY", "elogix-change-this-64-char-secret")
ALGORITHM  = "HS256"
ACCESS_EXP = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES_MINUTES", 480)) * 60
REFRESH_EXP= int(os.getenv("JWT_REFRESH_TOKEN_EXPIRES_DAYS",  30))  * 86400

# Password policy
PW_MIN_LENGTH  = 10
PW_REGEX       = re.compile(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+\-=])[A-Za-z\d@$!%*?&#^()_+\-=]{10,}$')
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_MINUTES     = 30

def _now(): return datetime.now(timezone.utc)

class AuthService:

    # ── Password ─────────────────────────────────────────────
    @staticmethod
    def hash_password(password: str) -> str:
        return bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12)).decode()

    @staticmethod
    def check_password(password: str, hashed: str) -> bool:
        try:
            return bcrypt.checkpw(password.encode(), hashed.encode())
        except Exception:
            return False

    @staticmethod
    def validate_password_strength(password: str) -> tuple[bool, str]:
        """Enforce eLogix password policy."""
        if len(password) < PW_MIN_LENGTH:
            return False, f"Password must be at least {PW_MIN_LENGTH} characters"
        if not PW_REGEX.match(password):
            return False, "Password must contain uppercase, lowercase, number, and special character"
        if password.lower() in ("elogix123!", "password1!", "nepal@123"):
            return False, "Password is too common. Choose a unique password."
        return True, ""

    # ── Token generation ──────────────────────────────────────
    @staticmethod
    def generate_access_token(user_id: str, company_id: str, role: str,
                               department_id: str = None, branch_id: str = None,
                               level: int = 10, permissions: dict = None,
                               tenant_slug: str = None) -> str:
        jti = secrets.token_hex(32)
        payload = {
            "sub":           user_id,
            "company_id":    company_id,
            "tenant_id":     company_id,
            "tenant_slug":   tenant_slug or "",
            "role":          role,
            "level":         level,
            "dept_id":       department_id,
            "branch_id":     branch_id,
            "permissions":   permissions or {},
            "type":          "access",
            "iss":           "elogix.com.np",
            "aud":           "elogix-hrms",
            "iat":           _now(),
            "exp":           _now() + timedelta(seconds=ACCESS_EXP),
            "jti":           jti,
        }
        return jwt.encode(payload, SECRET, algorithm=ALGORITHM), jti

    @staticmethod
    def generate_refresh_token(user_id: str, company_id: str) -> tuple[str, str]:
        jti = secrets.token_hex(48)
        payload = {
            "sub":        user_id,
            "company_id": company_id,
            "type":       "refresh",
            "iss":        "elogix.com.np",
            "iat":        _now(),
            "exp":        _now() + timedelta(seconds=REFRESH_EXP),
            "jti":        jti,
        }
        return jwt.encode(payload, SECRET, algorithm=ALGORITHM), jti

    @staticmethod
    def decode_token(token: str) -> dict:
        try:
            payload = jwt.decode(token, SECRET, algorithms=[ALGORITHM],
                                  audience="elogix-hrms", issuer="elogix.com.np")
            return payload
        except jwt.ExpiredSignatureError:
            raise ValueError("eLogix: Token expired — please log in again")
        except jwt.InvalidAudienceError:
            raise ValueError("eLogix: Invalid token audience")
        except jwt.InvalidIssuerError:
            raise ValueError("eLogix: Invalid token issuer")
        except jwt.InvalidTokenError as e:
            raise ValueError(f"eLogix: Invalid token — {e}")

    # ── Token revocation (blacklist check) ────────────────────
    @staticmethod
    def is_token_revoked(jti: str) -> bool:
        from ..extensions import db
        from ..saas.models import BlacklistedToken
        return db.session.query(BlacklistedToken).filter_by(jti=jti).first() is not None

    @staticmethod
    def revoke_token(jti: str, user_id: str, company_id: str, reason: str = "logout"):
        from ..extensions import db
        from ..saas.models import BlacklistedToken
        if not db.session.query(BlacklistedToken).filter_by(jti=jti).first():
            db.session.add(BlacklistedToken(
                jti=jti, user_id=user_id, company_id=company_id, reason=reason
            ))
            db.session.commit()

    @staticmethod
    def revoke_all_user_tokens(user_id: str, company_id: str, reason: str = "admin_force"):
        """Force logout user from all devices."""
        from ..extensions import db
        from ..saas.models import UserSession, BlacklistedToken
        sessions = db.session.query(UserSession).filter_by(
            user_id=user_id, company_id=company_id, is_valid=True
        ).all()
        for s in sessions:
            s.is_valid = False
            s.revoked_at = _now()
            if not db.session.query(BlacklistedToken).filter_by(jti=s.jti).first():
                db.session.add(BlacklistedToken(jti=s.jti, user_id=user_id,
                                                company_id=company_id, reason=reason))
        db.session.commit()

    # ── Login flow ────────────────────────────────────────────
    @classmethod
    def login(cls, email: str, password: str, company_slug: str,
               ip: str = None, user_agent: str = None) -> dict:
        """
        Full eLogix login flow:
        1. Find company by slug
        2. Find user within that company (strict isolation)
        3. Check account lock, active status, subscription
        4. Verify password
        5. Load RBAC permissions
        6. Generate JWT pair + create session
        7. Return full auth response
        """
        from ..extensions import db
        from ..saas.models import Company, CompanyUser, UserSession, ModulePermission

        # Step 1 — Validate company
        company = db.session.query(Company).filter_by(slug=company_slug).first()
        if not company:
            raise ValueError("Company not found. Check your eLogix portal URL.")
        if not company.is_active():
            raise ValueError(f"eLogix account is {company.status}. Contact support@elogix.com.np")

        # Step 2 — Find user WITHIN this company ONLY
        user = db.session.query(CompanyUser).filter_by(
            company_id=company.id, email=email.lower().strip()
        ).first()
        if not user:
            raise ValueError("Invalid email or password")

        # Step 3 — Account checks
        if not user.is_active:
            raise ValueError("Account deactivated. Contact your HR administrator.")
        if user.is_locked():
            mins = int((user.locked_until - _now()).seconds / 60) + 1
            raise ValueError(f"Account locked for {mins} minutes due to failed attempts. "
                             f"Contact hr@{company_slug}.elogix.com.np")

        # Step 4 — Password verification
        if not cls.check_password(password, user.password_hash):
            user.failed_logins = (user.failed_logins or 0) + 1
            if user.failed_logins >= MAX_FAILED_ATTEMPTS:
                user.locked_until = _now() + timedelta(minutes=LOCKOUT_MINUTES)
                user.failed_logins = 0
            db.session.commit()
            raise ValueError("Invalid email or password")

        # Reset failed attempts on success
        user.failed_logins = 0
        user.locked_until = None
        user.last_login_at = _now()
        user.last_login_ip = ip

        # Step 5 — Load permissions
        perms_rows = db.session.query(ModulePermission).filter_by(
            company_id=company.id, role_id=user.role_id
        ).all()
        permissions = {
            p.module: {
                "view": p.can_view, "create": p.can_create, "edit": p.can_edit,
                "delete": p.can_delete, "approve": p.can_approve,
                "export": p.can_export, "scope": p.scope,
            } for p in perms_rows
        }

        # Step 6 — Generate JWT
        access_token, access_jti = cls.generate_access_token(
            user_id       = user.id,
            company_id    = company.id,
            role          = user.role_slug,
            department_id = user.department_id,
            branch_id     = user.branch_id,
            level         = user.level,
            permissions   = permissions,
            tenant_slug   = company.slug,
        )
        refresh_token, refresh_jti = cls.generate_refresh_token(user.id, company.id)

        # Step 7 — Record session
        session = UserSession(
            user_id    = user.id,
            company_id = company.id,
            jti        = access_jti,
            ip_address = ip,
            user_agent = user_agent,
            expires_at = _now() + timedelta(seconds=ACCESS_EXP),
        )
        db.session.add(session)
        db.session.commit()

        return {
            "success":       True,
            "brand":         "eLogix",
            "access_token":  access_token,
            "refresh_token": refresh_token,
            "token_type":    "Bearer",
            "expires_in":    ACCESS_EXP,
            "must_change_pw": user.must_change_pw,
            "mfa_required":  user.mfa_enabled,
            "user": {
                "id":           user.id,
                "full_name":    user.full_name,
                "email":        user.email,
                "emp_id":       user.emp_id,
                "role":         user.role_slug,
                "level":        user.level,
                "department_id":user.department_id,
                "branch_id":    user.branch_id,
            },
            "company": {
                "id":          company.id,
                "name":        company.name,
                "slug":        company.slug,
                "plan":        company.plan,
                "portal_url":  company.portal_url(),
                "logo_url":    company.logo_url,
                "currency":    company.currency,
                "timezone":    company.timezone,
            },
            "permissions": permissions,
        }

    # ── Password reset ────────────────────────────────────────
    @staticmethod
    def generate_reset_token(user: object) -> str:
        from ..extensions import db
        token = secrets.token_urlsafe(48)
        user.pw_reset_token = hashlib.sha256(token.encode()).hexdigest()
        user.pw_reset_expires_at = _now() + timedelta(hours=2)
        db.session.commit()
        return token  # Raw token sent to user; DB stores hash

    @staticmethod
    def verify_reset_token(token: str, company_id: str) -> Optional[object]:
        from ..extensions import db
        from ..saas.models import CompanyUser
        hashed = hashlib.sha256(token.encode()).hexdigest()
        user = db.session.query(CompanyUser).filter_by(
            company_id=company_id, pw_reset_token=hashed
        ).first()
        if not user or not user.pw_reset_expires_at or user.pw_reset_expires_at < _now():
            return None
        return user

    # ── Email verification ────────────────────────────────────
    @staticmethod
    def generate_email_verify_token(user: object) -> str:
        from ..extensions import db
        token = secrets.token_urlsafe(32)
        user.email_verify_token = token
        db.session.commit()
        return token

    # ── TOTP MFA ──────────────────────────────────────────────
    @staticmethod
    def generate_totp_secret() -> str:
        import pyotp
        return pyotp.random_base32()

    @staticmethod
    def verify_totp(secret: str, code: str) -> bool:
        try:
            import pyotp
            return pyotp.TOTP(secret).verify(code, valid_window=1)
        except Exception:
            return False
