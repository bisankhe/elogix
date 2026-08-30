"""Row-level security plumbing.

Postgres policies read `app.current_company_id`. This module is what sets it, and it sets
it **transaction-locally** (`set_config(..., true)`), never session-locally: connections
are pooled, so a session-scoped setting would leak the previous request's tenant into the
next one that borrowed the same connection.

Because the setting dies with its transaction, it cannot be set once per request and
forgotten — a commit ends the transaction and the next statement would run with no tenant
at all. So it is re-applied automatically on every `after_begin`, from a context variable.

Application-level `WHERE company_id = ...` filters stay in the queries regardless. In the
prototype these filters *were* the security boundary and were never consistently applied;
here they are the second of two independent layers.
"""

import uuid
from contextvars import ContextVar

from sqlalchemy import Connection, event, text
from sqlalchemy.orm import Session, SessionTransaction

SETTING = "app.current_company_id"

_current_company: ContextVar[uuid.UUID | None] = ContextVar("current_company", default=None)

_SET_TENANT = text(f"SELECT set_config('{SETTING}', :cid, true)")


@event.listens_for(Session, "after_begin")
def _apply_tenant_on_begin(
    session: Session, transaction: SessionTransaction, connection: Connection
) -> None:
    """Re-apply the tenant setting at the start of every transaction on every session.

    This must go through `connection`, not `session`: the session is still provisioning
    that connection when the event fires, and re-entering it raises
    "concurrent operations are not permitted".
    """
    company_id = _current_company.get()
    if company_id is not None:
        connection.execute(_SET_TENANT, {"cid": str(company_id)})


def set_current_company(session: Session, company_id: uuid.UUID) -> None:
    """Bind this request to a tenant, and apply it to the transaction already in flight.

    The context variable covers every transaction opened from here on; the explicit
    `set_config` covers the one that may already have begun before we knew the tenant
    (during login, resolving the company by slug opens a transaction first).
    """
    _current_company.set(company_id)
    session.execute(_SET_TENANT, {"cid": str(company_id)})


def clear_current_company() -> None:
    _current_company.set(None)


def get_current_company() -> uuid.UUID | None:
    return _current_company.get()
