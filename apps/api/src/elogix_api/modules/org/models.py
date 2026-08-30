"""Organization structure — the cluster every other table foreign-keys into.

This is precisely where the prototype's uuid-versus-integer war was fought, and it has to
be settled before anything references it. Everything here is UUID, every table carries
`company_id`, and every code is unique per tenant rather than globally.

The shape is a deliberate simplification of the prototype's 14 tables. Two ideas do the
work of many:

* **`OrgUnit` is one self-referencing tree**, not five near-identical tables. The
  prototype had separate `group_companies`, `branches`, `business_units`, `departments`,
  `sections` and `teams`, each with its own parent column and its own copy of the same
  CRUD. They are the same entity at different depths, so they are one table with a
  `kind` discriminator — which also means an eight-level hierarchy costs no new schema.
* **`Position` is the join between a person-shaped thing and a place-shaped thing.**
  Designation says *what* the job is, grade says *what it pays*, org unit says *where it
  sits*, location says *where it is worked*. Keeping those four separate is what lets
  payroll band by grade while HR reports by department.
"""

import enum
import uuid

from sqlalchemy import Boolean, CheckConstraint, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, declared_attr, mapped_column, relationship

from elogix_api.db.base import Base
from elogix_api.db.types import TimestampMixin, company_fk, uuid_pk


class OrgUnitKind(enum.StrEnum):
    """Depth labels for the single org tree. Ordered broadest to narrowest."""

    GROUP = "group"
    COMPANY = "company"
    BRANCH = "branch"
    BUSINESS_UNIT = "business_unit"
    DIVISION = "division"
    DEPARTMENT = "department"
    SECTION = "section"
    TEAM = "team"


class EmploymentType(enum.StrEnum):
    """Nepal Labour Act 2074 recognises these employment categories."""

    PERMANENT = "permanent"
    PROBATION = "probation"
    CONTRACT = "contract"
    CASUAL = "casual"
    PART_TIME = "part_time"
    TRAINEE = "trainee"
    INTERN = "intern"
    OUTSOURCED = "outsourced"
    CONSULTANT = "consultant"


class ReferenceMixin(TimestampMixin):
    """The shape shared by every org reference table.

    Declaring it once means the list/create/deactivate helpers in the router can be typed
    against this, instead of taking `type[Base]` and reaching for attributes the type
    checker cannot see.

    `company_id` needs `declared_attr` rather than a plain column: a `ForeignKey` object
    cannot be shared between mapped classes, so each subclass must get its own.
    """

    id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    code: Mapped[str] = mapped_column(String(32), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    @declared_attr
    @classmethod
    def company_id(cls) -> Mapped[uuid.UUID]:
        return company_fk()


class OrgUnit(Base, TimestampMixin):
    """One node of the organization tree, at any depth."""

    __tablename__ = "org_units"
    __table_args__ = (
        UniqueConstraint("company_id", "code"),
        # A node cannot be its own parent. Deeper cycles are rejected in the service
        # layer, which can walk the chain; a check constraint cannot.
        CheckConstraint("id <> parent_id", name="not_own_parent"),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    company_id: Mapped[uuid.UUID] = company_fk()
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("org_units.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
    )
    kind: Mapped[OrgUnitKind] = mapped_column(
        String(32), nullable=False, default=OrgUnitKind.DEPARTMENT
    )
    code: Mapped[str] = mapped_column(String(32), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    # Denormalised depth, maintained by the service. Cheap to keep, and it turns
    # "render the tree in order" into a single indexed sort.
    depth: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    parent: Mapped["OrgUnit | None"] = relationship(remote_side="OrgUnit.id")


class CostCentre(Base, ReferenceMixin):
    """Where spend lands. Deliberately separate from the org tree: finance and HR
    reporting lines diverge often enough that merging them causes pain later."""

    __tablename__ = "cost_centres"
    __table_args__ = (UniqueConstraint("company_id", "code"),)



class WorkLocation(Base, ReferenceMixin):
    """A physical place work happens. Attendance and field-visit tracking hang off this
    in phase 04, which is why it carries coordinates now rather than being retrofitted."""

    __tablename__ = "work_locations"
    __table_args__ = (UniqueConstraint("company_id", "code"),)

    address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    district: Mapped[str | None] = mapped_column(String(100), nullable=True)
    latitude: Mapped[str | None] = mapped_column(String(32), nullable=True)
    longitude: Mapped[str | None] = mapped_column(String(32), nullable=True)


class GradeLevel(Base, ReferenceMixin):
    """Pay band. `rank` orders them; salary ranges are indicative until phase 06 owns
    the real structures."""

    __tablename__ = "grade_levels"
    __table_args__ = (
        UniqueConstraint("company_id", "code"),
        # Named explicitly: the `uq_` naming convention keys off the *first* column only,
        # so a second composite unique starting with company_id would collide with the
        # one above and fail at CREATE TABLE. Any table with two composite uniques on the
        # same leading column needs an explicit name like this.
        UniqueConstraint("company_id", "rank", name="uq_grade_levels_company_id_rank"),
    )

    rank: Mapped[int] = mapped_column(Integer, nullable=False)


class Designation(Base, ReferenceMixin):
    """Job title. Separate from grade so two people can share a title on different bands,
    and from position so a title can exist without a headcount slot."""

    __tablename__ = "designations"
    __table_args__ = (UniqueConstraint("company_id", "code"),)

    grade_level_id: Mapped[uuid.UUID | None] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("grade_levels.id", ondelete="SET NULL"), nullable=True
    )


class EmploymentCategory(Base, ReferenceMixin):
    """A tenant's own naming for an employment type, bound to a statutory category.

    `employment_type` is what the Labour Act cares about — probation caps, notice periods,
    overtime eligibility — and it must not be free text. `name` is what the tenant calls
    it internally.
    """

    __tablename__ = "employment_categories"
    __table_args__ = (UniqueConstraint("company_id", "code"),)

    employment_type: Mapped[EmploymentType] = mapped_column(String(32), nullable=False)
    # Nepal Labour Act 2074 caps probation at six months.
    probation_months: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    notice_days: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    is_overtime_eligible: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class Position(Base, TimestampMixin):
    """A headcount slot: one designation, in one org unit, at one location.

    Positions exist whether or not anyone fills them, which is what makes vacancy and
    headcount reporting possible without inventing a parallel structure later.
    """

    __tablename__ = "positions"
    __table_args__ = (UniqueConstraint("company_id", "code"),)

    id: Mapped[uuid.UUID] = uuid_pk()
    company_id: Mapped[uuid.UUID] = company_fk()
    code: Mapped[str] = mapped_column(String(32), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    org_unit_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("org_units.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    designation_id: Mapped[uuid.UUID | None] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("designations.id", ondelete="SET NULL"), nullable=True
    )
    cost_centre_id: Mapped[uuid.UUID | None] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("cost_centres.id", ondelete="SET NULL"), nullable=True
    )
    work_location_id: Mapped[uuid.UUID | None] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("work_locations.id", ondelete="SET NULL"), nullable=True
    )
    employment_category_id: Mapped[uuid.UUID | None] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("employment_categories.id", ondelete="SET NULL"),
        nullable=True,
    )
    reports_to_id: Mapped[uuid.UUID | None] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("positions.id", ondelete="SET NULL"), nullable=True
    )
    headcount: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
