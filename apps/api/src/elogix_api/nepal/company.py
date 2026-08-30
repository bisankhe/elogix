"""Nepal — the documents a company must hold, as data.

⚠️ **Unverified.** This list is ported from the prototype's own
`COUNTRY_MANDATORY_DOCS["NP"]` and has not been checked against the Acts by a named
person. It joins the tax slabs, labour constants and settlement rules already waiting on
that sign-off, and it is the cheapest of them to check: each entry names the issuing
authority, so a reviewer can confirm ten items against ten offices.

Kept here rather than in `modules/org/` for the same reason the tax slabs are: these are
legal requirements, not product decisions. They change when the law changes, they need
reading by someone checking the statute, and every company should be able to add its own
without a release — so this is the seeded default, not the whole truth.

**Renewal is the point.** Half of these expire. A trade licence or a tax clearance that
lapses unnoticed stops a company operating, and the prototype's own version of this
carried an expiry-alert endpoint beside it. The `renews` flag is what tells the checklist
whether a missing `expires_on` is an omission or simply not applicable.
"""

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class StatutoryDocument:
    code: str
    name: str
    authority: str
    # The provision that requires it, where the prototype recorded one. Empty means the
    # requirement is real but the citation was not carried over and should be found.
    citation: str
    renews: bool
    note: str


# The ten a Nepali company is expected to hold. Order is roughly the order they are
# obtained in, which is also the order a new company collects them.
NEPAL_COMPANY_DOCUMENTS: tuple[StatutoryDocument, ...] = (
    StatutoryDocument(
        code="OCR_CERTIFICATE",
        name="Company Registration Certificate",
        authority="Office of the Company Registrar",
        citation="Companies Act 2063",
        renews=False,
        note="The registration itself. Everything else follows from it.",
    ),
    StatutoryDocument(
        code="COMPANY_STATUTE",
        name="Memorandum and Articles of Association",
        authority="Office of the Company Registrar",
        citation="Companies Act 2063",
        renews=False,
        note="Filed with the registration; amended by special resolution.",
    ),
    StatutoryDocument(
        code="PAN_CERTIFICATE",
        name="PAN Certificate",
        authority="Inland Revenue Department",
        citation="",
        renews=False,
        note="The employer's Permanent Account Number appears on every tax filing.",
    ),
    StatutoryDocument(
        code="VAT_CERTIFICATE",
        name="VAT Registration Certificate",
        authority="Inland Revenue Department",
        citation="",
        renews=False,
        note="Required above the registration threshold; not every company has one.",
    ),
    StatutoryDocument(
        code="SSF_REGISTRATION",
        name="SSF Employer Registration",
        authority="Social Security Fund",
        citation="Labour Act 2074, section 102",
        renews=False,
        note=(
            "Carries the employer code. Without it no SSF contribution can be remitted, "
            "which makes this the one that blocks payroll rather than merely embarrasses."
        ),
    ),
    StatutoryDocument(
        code="TAX_CLEARANCE",
        name="Tax Clearance Certificate",
        authority="Inland Revenue Department",
        citation="",
        renews=True,
        note="Annual. Commonly demanded when tendering or renewing a licence.",
    ),
    StatutoryDocument(
        code="TRADE_LICENSE",
        name="Trade Licence / Firm Renewal",
        authority="Department of Commerce",
        citation="",
        renews=True,
        note="Annual renewal. Lapsing stops the company trading.",
    ),
    StatutoryDocument(
        code="WARD_REGISTRATION",
        name="Ward / Municipality Registration",
        authority="Local ward office",
        citation="",
        renews=True,
        note="Filed at the ward the registered address sits in.",
    ),
    StatutoryDocument(
        code="LABOUR_AUDIT",
        name="Annual Labour Audit Report",
        authority="Department of Labour",
        citation="Labour Act 2074, section 142",
        renews=True,
        note="Annual. Reports on employment practice, not on money.",
    ),
    StatutoryDocument(
        code="AUDITED_ACCOUNTS",
        name="Audited Financial Statements",
        authority="Chartered accountant (ICAN)",
        citation="",
        renews=True,
        note="Annual, and a precondition for the tax clearance above.",
    ),
)

BY_CODE: dict[str, StatutoryDocument] = {d.code: d for d in NEPAL_COMPANY_DOCUMENTS}
