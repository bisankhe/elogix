"""The company's own record: its statutory identity and the documents behind it.

`Company` is defined in `modules/identity/` because login has to resolve a slug to a
tenant before any tenant context exists — it is the registry. This module is the
tenant's *description of itself*, which is org-shaped, so the endpoints live here while
the model stays there. Splitting a model's storage from its administration is worth one
sentence of explanation and saves a circular import.

The compliance view is the point of the whole file. A company that cannot find its SSF
employer code cannot remit a contribution, and one whose trade licence lapsed last month
does not find out from a filing cabinet.
"""

import uuid
from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from elogix_api.modules.identity.models import Company, CompanyDocument
from elogix_api.modules.org.schemas import (
    CompanyCompliance,
    ComplianceItem,
)
from elogix_api.nepal import company as statutory

# Fields a filing needs. Missing any of them is reported, because "the profile is 80%
# complete" is useless next to "you cannot file without the SSF code".
FILING_FIELDS: tuple[tuple[str, str], ...] = (
    ("legal_name", "Registered legal name"),
    ("pan_number", "PAN number"),
    ("registration_number", "Company registration number"),
    ("ssf_employer_code", "SSF employer code"),
    ("address", "Registered address"),
    ("district", "District"),
)

# A document inside this window is reported as due rather than merely present.
RENEWAL_WINDOW_DAYS = 60


def missing_filing_fields(company: Company) -> list[str]:
    """Which filing identifiers are still blank, by their human name."""
    return [
        label
        for field, label in FILING_FIELDS
        if not (getattr(company, field) or "").strip()
    ]


def compliance(
    db: Session, *, company: Company, today: date | None = None
) -> CompanyCompliance:
    """Every statutory document, held or not, with its renewal state.

    Built from the statutory list rather than from the rows, so a document that was
    never collected appears as *missing* rather than simply not appearing. That
    inversion is the whole value: a checklist that only lists what you have cannot tell
    you what you lack.
    """
    today = today or date.today()
    horizon = today + timedelta(days=RENEWAL_WINDOW_DAYS)

    held = {
        row.category: row
        for row in db.execute(
            select(CompanyDocument).where(CompanyDocument.company_id == company.id)
        ).scalars()
    }

    items: list[ComplianceItem] = []
    for spec in statutory.NEPAL_COMPANY_DOCUMENTS:
        row = held.get(spec.code)
        expires_on = row.expires_on if row else None

        if row is None:
            status, detail = "missing", "Not on file."
        elif expires_on is None:
            status, detail = (
                ("held", "On file. No expiry recorded.")
                if not spec.renews
                else ("held", "On file, but no expiry date is recorded and this one renews.")
            )
        elif expires_on < today:
            status = "expired"
            detail = f"Expired {(today - expires_on).days} day(s) ago."
        elif expires_on <= horizon:
            status = "due"
            detail = f"Renews in {(expires_on - today).days} day(s)."
        else:
            status, detail = "held", f"Valid to {expires_on.isoformat()}."

        items.append(
            ComplianceItem(
                code=spec.code,
                name=spec.name,
                authority=spec.authority,
                citation=spec.citation or None,
                renews=spec.renews,
                note=spec.note,
                status=status,
                detail=detail,
                document_id=row.id if row else None,
                expires_on=expires_on,
                is_verified=row.is_verified if row else False,
            )
        )

    # Expired first, then due, then missing, then held — the order somebody acts in.
    rank = {"expired": 0, "due": 1, "missing": 2, "held": 3}
    items.sort(key=lambda i: (rank[i.status], i.name))

    return CompanyCompliance(
        as_of=today,
        missing_filing_fields=missing_filing_fields(company),
        items=items,
        held=sum(1 for i in items if i.status == "held"),
        due=sum(1 for i in items if i.status == "due"),
        expired=sum(1 for i in items if i.status == "expired"),
        missing=sum(1 for i in items if i.status == "missing"),
    )


def get_document(
    db: Session, *, company_id: uuid.UUID, document_id: uuid.UUID
) -> CompanyDocument | None:
    return db.execute(
        select(CompanyDocument).where(
            CompanyDocument.id == document_id,
            CompanyDocument.company_id == company_id,
        )
    ).scalar_one_or_none()
