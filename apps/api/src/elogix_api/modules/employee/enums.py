"""Employee enums and the column helper that stores them.

Kept beside the models so the helper's reasoning has somewhere to live.
"""

import enum

from sqlalchemy import Enum


class EmployeeStatus(enum.StrEnum):
    PROBATION = "probation"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    EXITED = "exited"


class Gender(enum.StrEnum):
    FEMALE = "female"
    MALE = "male"
    OTHER = "other"
    UNDISCLOSED = "undisclosed"


class MaritalStatus(enum.StrEnum):
    """Not cosmetic: Nepal's income tax slabs differ for single and married filers, so
    payroll reads this in phase 06."""

    SINGLE = "single"
    MARRIED = "married"


class AssignmentReason(enum.StrEnum):
    HIRE = "hire"
    CONFIRMATION = "confirmation"
    TRANSFER = "transfer"
    PROMOTION = "promotion"
    DEMOTION = "demotion"
    REDESIGNATION = "redesignation"
    EXIT = "exit"


class EmployeeEventType(enum.StrEnum):
    HIRED = "hired"
    CONFIRMED = "confirmed"
    ASSIGNED = "assigned"
    SUSPENDED = "suspended"
    REINSTATED = "reinstated"
    EXITED = "exited"


class DocumentType(enum.StrEnum):
    CITIZENSHIP = "citizenship"
    PASSPORT = "passport"
    CV = "cv"
    ACADEMIC = "academic"
    TRAINING = "training"
    CONTRACT = "contract"
    APPOINTMENT_LETTER = "appointment_letter"
    EXPERIENCE_LETTER = "experience_letter"
    MEDICAL = "medical"
    OTHER = "other"


def enum_column(enum_class: type[enum.StrEnum]) -> Enum:
    """A string-backed enum column.

    `native_enum=False` stores VARCHAR with a CHECK constraint rather than a Postgres
    ENUM type. Three reasons, each learned the hard way in this repo:

    * Values round-trip as the enum member. A plain `String` column returns `str`, which
      makes `employee.status is EmployeeStatus.EXITED` silently always false — a bug that
      let an already-exited employee be exited again.
    * Adding a value is an ordinary migration instead of `ALTER TYPE`.
    * There is no Postgres type left behind for a downgrade to forget to drop, which has
      broken the migration round-trip twice already.

    `values_callable` stores the lowercase *values* (`"exited"`), not the member names
    (`"EXITED"`), which is what the API and the frontend speak.
    """
    return Enum(
        enum_class,
        native_enum=False,
        length=32,
        values_callable=lambda e: [member.value for member in e],
    )
