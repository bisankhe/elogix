"""Row-level security.

Phase 01's done-when: 'a tenant cannot read another tenant's rows even with a hand-forged
query'. The tests below are that sentence, made executable — they deliberately write
queries with *no* application-level company filter, so only Postgres can be what stops
them.

The prototype had RLS policies too. They did nothing, because the application connected
as a role Postgres exempts from them. `test_the_runtime_role_cannot_bypass_rls` is the
guard against that returning.
"""

import uuid

import pytest
from sqlalchemy import text
from sqlalchemy.exc import ProgrammingError
from sqlalchemy.orm import Session

from elogix_api.core.tenancy import clear_current_company, set_current_company
from elogix_api.modules.employee.models import Employee
from tests.conftest import TENANT_TABLES, make_tenant


def test_the_runtime_role_cannot_bypass_rls(db: Session) -> None:
    """If DATABASE_URL ever points at a superuser again, every other test here is a lie."""
    row = db.execute(
        text("SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user")
    ).one()

    assert row.rolsuper is False, "the application must not connect as a superuser"
    assert row.rolbypassrls is False, "the application role must not have BYPASSRLS"


@pytest.mark.parametrize("table", TENANT_TABLES)
def test_every_tenant_table_is_protected(db: Session, table: str) -> None:
    """Catches a new tenant-scoped table being added without a policy."""
    enabled, forced = db.execute(
        text("SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = :t"),
        {"t": table},
    ).one()

    assert enabled, f"{table} does not have row-level security enabled"
    # FORCE is the part that is easy to omit and impossible to notice: without it the
    # table's owner silently skips every policy.
    assert forced, f"{table} does not FORCE row-level security"

    policies = db.execute(
        text("SELECT count(*) FROM pg_policies WHERE tablename = :t"), {"t": table}
    ).scalar_one()
    assert policies >= 1, f"{table} has no policy"


def test_an_unfiltered_query_returns_only_the_bound_tenants_rows(db: Session) -> None:
    """The heart of it: no WHERE company_id anywhere, and still no leak."""
    acme, _, _ = make_tenant(db, "acme")
    make_tenant(db, "globex")

    set_current_company(db, acme.id)
    rows = db.execute(text("SELECT company_id FROM employees")).scalars().all()

    assert len(rows) == 1
    assert rows[0] == acme.id


def test_the_orm_leaks_nothing_either_without_a_filter(db: Session) -> None:
    acme, _, _ = make_tenant(db, "acme")
    make_tenant(db, "globex")

    set_current_company(db, acme.id)
    # Deliberately missing `.where(Employee.company_id == ...)`.
    employees = db.query(Employee).all()

    assert [e.company_id for e in employees] == [acme.id]


def test_no_tenant_bound_means_no_rows(db: Session) -> None:
    """Fail closed. An unset setting must not read as 'all tenants'."""
    make_tenant(db, "acme")
    make_tenant(db, "globex")

    clear_current_company()
    assert db.execute(text("SELECT count(*) FROM employees")).scalar_one() == 0


def test_a_row_cannot_be_written_for_another_tenant(db: Session) -> None:
    """WITH CHECK, not just USING — reading is not the only way to cross a boundary."""
    acme, _, _ = make_tenant(db, "acme")
    globex, _, _ = make_tenant(db, "globex")

    set_current_company(db, acme.id)
    db.add(
        Employee(
            company_id=globex.id,
            employee_code="SMUGGLED",
            full_name="Not Mine",
            joined_on=__import__("datetime").date(2024, 1, 1),
        )
    )

    with pytest.raises(ProgrammingError):
        db.commit()
    db.rollback()


def test_a_row_cannot_be_moved_to_another_tenant(db: Session) -> None:
    acme, _, acme_employee = make_tenant(db, "acme")
    globex, _, _ = make_tenant(db, "globex")

    set_current_company(db, acme.id)
    with pytest.raises(ProgrammingError):
        db.execute(
            text("UPDATE employees SET company_id = :other WHERE id = :id"),
            {"other": globex.id, "id": acme_employee.id},
        )
        db.commit()
    db.rollback()


def test_binding_an_unknown_tenant_shows_nothing(db: Session) -> None:
    make_tenant(db, "acme")

    set_current_company(db, uuid.uuid4())
    assert db.execute(text("SELECT count(*) FROM employees")).scalar_one() == 0
