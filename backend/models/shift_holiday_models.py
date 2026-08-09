"""
FILE: backend/models/shift_holiday_models.py
NepHR Pro — Shift Type, Holiday Calendar, Weekend Policy Models
Nepal Labour Act 2074 constraints enforced at model level.
Used by: backend/routes/workforce_config_routes.py
"""
from __future__ import annotations
from datetime import datetime, date, time
import uuid
import enum

from sqlalchemy import (
    Column, String, Boolean, Integer, Float, Text, Date, DateTime,
    Numeric, Time, Enum as SAEnum, Index, CheckConstraint,
    UniqueConstraint, event,
)
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY

# ── Standalone Base ───────────────────────────────────────────
class Base(DeclarativeBase):
    pass

def _uuid(): return str(uuid.uuid4())
def _now():  return datetime.utcnow()


class ShiftTypeEnum(str, enum.Enum):
    DAY        = "day"
    MORNING    = "morning"
    EVENING    = "evening"
    NIGHT      = "night"
    ROTATIONAL = "rotational"
    FLEXIBLE   = "flexible"
    SPLIT      = "split"
    CUSTOM     = "custom"


class HolidayTypeEnum(str, enum.Enum):
    STATUTORY  = "statutory"
    CULTURAL   = "cultural"
    OPTIONAL   = "optional"
    FLOATING   = "floating"
    RESTRICTED = "restricted"


# ═══════════════════════════════════════════════════════════════
# SHIFT TYPE
# Nepal Labour Act 2074:
#   Section 28: Max 8 hrs/day standard
#   Section 30: OT = min 1.5x
#   Section 32: Night shift premium mandatory
# ═══════════════════════════════════════════════════════════════
class ShiftType(Base):
    __tablename__ = "shift_types"

    id                    = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    company_id            = Column(UUID(as_uuid=False), nullable=True)  # NULL = global template

    code                  = Column(String(20),  nullable=False)
    name                  = Column(String(100), nullable=False)
    name_nepali           = Column(String(100))
    type                  = Column(SAEnum(ShiftTypeEnum), nullable=False, default=ShiftTypeEnum.DAY)
    description           = Column(Text)
    icon                  = Column(String(10), default="⏰")
    color                 = Column(String(7),  default="#64748b")

    # Time
    start_time            = Column(Time, nullable=False, default=time(9, 0))
    end_time              = Column(Time, nullable=False, default=time(18, 0))
    working_hours         = Column(Numeric(4, 1), nullable=False, default=8.0)
    break_minutes         = Column(Integer, default=60)
    grace_minutes         = Column(Integer, default=15)

    # Compensation
    allowance_npr         = Column(Numeric(10, 2), default=0)
    night_premium_pct     = Column(Numeric(5, 2), default=0)
    weekend_ot_multiplier = Column(Numeric(4, 2), default=1.5)
    holiday_ot_multiplier = Column(Numeric(4, 2), default=2.0)

    # Stats (denormalised for fast display)
    dept_count            = Column(Integer, default=0)
    emp_count             = Column(Integer, default=0)

    # Nepal law reference
    la_note               = Column(Text)

    status                = Column(String(20), default="active")
    created_at            = Column(DateTime, default=_now)
    updated_at            = Column(DateTime, default=_now, onupdate=_now)
    created_by            = Column(UUID(as_uuid=False))
    is_deleted            = Column(Boolean, default=False)

    __table_args__ = (
        UniqueConstraint("company_id", "code", name="uq_shift_code"),
        Index("idx_shift_company", "company_id"),
        Index("idx_shift_type",    "type"),
        # Nepal law: standard hours max 8
        CheckConstraint("working_hours > 0 AND working_hours <= 8",
                        name="ck_shift_max_8hrs"),
        # Night shift must have premium
        CheckConstraint(
            "type != 'night' OR (night_premium_pct IS NOT NULL AND night_premium_pct > 0)",
            name="ck_shift_night_premium"
        ),
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id, "company_id": self.company_id,
            "code": self.code, "name": self.name, "name_nepali": self.name_nepali,
            "type": self.type.value if self.type else None,
            "description": self.description, "icon": self.icon, "color": self.color,
            "start_time":     str(self.start_time)     if self.start_time  else None,
            "end_time":       str(self.end_time)       if self.end_time    else None,
            "working_hours":  float(self.working_hours) if self.working_hours else 8.0,
            "break_minutes":  self.break_minutes,
            "grace_minutes":  self.grace_minutes,
            "allowance_npr":  float(self.allowance_npr  or 0),
            "night_premium_pct":     float(self.night_premium_pct     or 0),
            "weekend_ot_multiplier": float(self.weekend_ot_multiplier or 1.5),
            "holiday_ot_multiplier": float(self.holiday_ot_multiplier or 2.0),
            "dept_count": self.dept_count, "emp_count": self.emp_count,
            "la_note": self.la_note, "status": self.status,
        }


# ═══════════════════════════════════════════════════════════════
# HOLIDAY CALENDAR
# Centralised master with branch/location inheritance.
# Nepal 2081/82 BS + optional/floating pool.
# ═══════════════════════════════════════════════════════════════
class HolidayCalendar(Base):
    __tablename__ = "holiday_calendar"

    id              = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    company_id      = Column(UUID(as_uuid=False), nullable=True)  # NULL = global template

    name            = Column(String(200), nullable=False)
    name_nepali     = Column(String(200))
    date_bs         = Column(String(15))        # e.g. "2081-09-27"
    date_ad         = Column(Date, nullable=False)
    year_bs         = Column(String(7))         # "2081" — for filter
    month_bs        = Column(String(3))         # "09"   — for filter

    type            = Column(SAEnum(HolidayTypeEnum), nullable=False, default=HolidayTypeEnum.STATUTORY)
    category        = Column(String(30), default="national")
    region          = Column(String(100), default="Nepal")
    applicable_to   = Column(String(50), default="all")

    is_paid         = Column(Boolean, default=True)
    is_optional     = Column(Boolean, default=False)

    color           = Column(String(7), default="#dc2626")

    payroll_impact  = Column(Boolean, default=True)
    leave_encashable = Column(Boolean, default=False)

    ai_imported     = Column(Boolean, default=False)
    ai_imported_at  = Column(DateTime)
    source          = Column(String(100), default="manual")
    notes           = Column(Text)

    created_at      = Column(DateTime, default=_now)
    updated_at      = Column(DateTime, default=_now, onupdate=_now)
    created_by      = Column(UUID(as_uuid=False))
    is_deleted      = Column(Boolean, default=False)

    __table_args__ = (
        Index("idx_hol_company",  "company_id"),
        Index("idx_hol_date_ad",  "date_ad"),
        Index("idx_hol_year_bs",  "company_id", "year_bs"),
        Index("idx_hol_type",     "type"),
        Index("idx_hol_optional", "is_optional"),
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id, "company_id": self.company_id,
            "name": self.name, "name_nepali": self.name_nepali,
            "date_bs": self.date_bs,
            "date_ad": self.date_ad.isoformat() if self.date_ad else None,
            "year_bs": self.year_bs, "month_bs": self.month_bs,
            "type":          self.type.value if self.type else None,
            "category":      self.category, "region": self.region,
            "applicable_to": self.applicable_to,
            "is_paid":       self.is_paid, "is_optional": self.is_optional,
            "color":         self.color,
            "payroll_impact":self.payroll_impact,
            "source":        self.source, "notes": self.notes,
        }


# ═══════════════════════════════════════════════════════════════
# WEEKEND POLICY
# Nepal Labour Act 2074:
#   Section 26: Minimum 1 rest day per week mandatory
#   Section 28: Max 48 hrs/week standard
# ═══════════════════════════════════════════════════════════════
class WeekendPolicy(Base):
    __tablename__ = "weekend_policies"

    id                  = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    company_id          = Column(UUID(as_uuid=False), nullable=True)  # NULL = global template

    code                = Column(String(20),  nullable=False)
    name                = Column(String(100), nullable=False)
    name_nepali         = Column(String(100))
    country             = Column(String(100), default="Nepal")
    region              = Column(String(100))

    # Workweek definition stored as JSONB arrays
    # 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
    work_days           = Column(JSONB, nullable=False, default=lambda: [1,2,3,4,5])
    weekend_days        = Column(JSONB, nullable=False, default=lambda: [0,6])
    half_day_days       = Column(JSONB, default=lambda: [])

    # OT rates for off-day work (Nepal law minimum = 1.5x)
    ot_rate_saturday    = Column(Numeric(4, 2), default=1.5)
    ot_rate_sunday      = Column(Numeric(4, 2), default=2.0)
    ot_rate_holiday     = Column(Numeric(4, 2), default=2.0)

    is_default          = Column(Boolean, default=False)
    assigned_branches   = Column(ARRAY(String), default=list)
    emp_count           = Column(Integer, default=0)

    la_note             = Column(Text)
    color               = Column(String(7), default="#1e40af")

    status              = Column(String(20), default="active")
    created_at          = Column(DateTime, default=_now)
    updated_at          = Column(DateTime, default=_now, onupdate=_now)
    created_by          = Column(UUID(as_uuid=False))
    is_deleted          = Column(Boolean, default=False)

    __table_args__ = (
        UniqueConstraint("company_id", "code", name="uq_wp_code"),
        Index("idx_wp_company",  "company_id"),
        Index("idx_wp_default",  "is_default"),
        Index("idx_wp_country",  "country"),
    )

    @property
    def work_days_count(self) -> int:
        return len(self.work_days) if self.work_days else 5

    @property
    def rest_days_count(self) -> int:
        return len(self.weekend_days) if self.weekend_days else 2

    @property
    def std_hours_per_week(self) -> float:
        return self.work_days_count * 8.0

    def to_dict(self) -> dict:
        return {
            "id": self.id, "company_id": self.company_id,
            "code": self.code, "name": self.name, "name_nepali": self.name_nepali,
            "country": self.country, "region": self.region,
            "work_days":      self.work_days     or [1,2,3,4,5],
            "weekend_days":   self.weekend_days  or [0,6],
            "half_day_days":  self.half_day_days or [],
            "work_days_count":   self.work_days_count,
            "rest_days_count":   self.rest_days_count,
            "std_hours_per_week":self.std_hours_per_week,
            "ot_rate_saturday": float(self.ot_rate_saturday or 1.5),
            "ot_rate_sunday":   float(self.ot_rate_sunday   or 2.0),
            "ot_rate_holiday":  float(self.ot_rate_holiday  or 2.0),
            "is_default":         self.is_default,
            "assigned_branches":  self.assigned_branches or [],
            "emp_count":          self.emp_count,
            "la_note":            self.la_note,
            "color":              self.color,
            "status":             self.status,
        }


# ── SQLAlchemy event listeners ─────────────────────────────────
@event.listens_for(ShiftType, "before_insert")
@event.listens_for(ShiftType, "before_update")
def validate_shift_nepal_law(mapper, connection, target):
    """Enforce Labour Act 2074 shift rules at ORM level."""
    if target.working_hours and float(target.working_hours) > 8:
        raise ValueError(
            "Labour Act 2074 Section 28: Standard shift cannot exceed 8 hours. "
            "Hours beyond 8 are overtime."
        )
    if (target.type == ShiftTypeEnum.NIGHT or
            (hasattr(target.type, 'value') and target.type.value == 'night')):
        if not target.night_premium_pct or float(target.night_premium_pct) <= 0:
            raise ValueError(
                "Labour Act 2074 Section 32: Night shift premium is mandatory."
            )


@event.listens_for(WeekendPolicy, "before_insert")
@event.listens_for(WeekendPolicy, "before_update")
def validate_weekend_nepal_law(mapper, connection, target):
    """Enforce minimum 1 rest day per Labour Act 2074 Section 26."""
    if not target.weekend_days or len(target.weekend_days) < 1:
        raise ValueError(
            "Labour Act 2074 Section 26: At least one weekly rest day is mandatory."
        )
