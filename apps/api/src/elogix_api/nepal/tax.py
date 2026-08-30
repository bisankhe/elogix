"""Nepal income tax and SSF — the statutory tables, as data.

⚠️ **UNVERIFIED. Nobody may be paid from these numbers until a named person has checked
them against the Finance Act.** This is the open decision the rebuild plan has carried
since the audit, and it blocks phase 06 shipping, not phase 06 being written.

Everything here is a *default*. A company's `TaxYear` rows are editable, so a tenant is
never trapped by a constant that turns out to be wrong.

---

**What the prototype got wrong**, established by reading
`legacy/backend/routes/salary_tax_routes.py`. These are the reasons this file exists
rather than a port:

1. **SSF was charged to the employee at the employer's rate.** It summed PF 10% +
   gratuity 8.33% + insurance 1.67% = 20% and called that `ssf_employee`. 20% is the
   *employer's* contribution; the employee contributes 11%.
2. **SSF was then deducted twice.** Once by subtracting it from `monthly_gross` before
   annualising, and again as the ARF allowance against assessable income. A contribution
   is relieved through the retirement-fund allowance *or* excluded from income, never
   both.
3. **Incentives were counted twice** — included in `monthly_gross`, which is multiplied
   by twelve, and then added again as `annual_incentive`.
4. **The 1% social security tax on the first slab was missing**, its first band sitting
   at 0%.
5. **Its FY 2083-84 single-filer table is internally inconsistent** — a ten-lakh
   zero-band topping out at 29%, where its own couple table for the same year and its
   own prior-year table both run 10/20/30/36/39. At least one of the three is wrong.

Sources to check against: Income Tax Act 2058 schedule 1, the current Finance Act, and
the Social Security Act 2074 with SSF Regulation 2075.
"""

from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal

ZERO = Decimal("0")
PAISA = Decimal("0.01")


def money(value: Decimal) -> Decimal:
    """Round to paisa, half-up. Never float: this is money people argue about."""
    return value.quantize(PAISA, rounding=ROUND_HALF_UP)


@dataclass(frozen=True, slots=True)
class Slab:
    """One band of the progressive scale. `width` of None means "everything above"."""

    width: Decimal | None
    rate: Decimal
    label: str


@dataclass(frozen=True, slots=True)
class TaxScale:
    single: tuple[Slab, ...]
    married: tuple[Slab, ...]


def _slabs(*rows: tuple[str | None, str, str]) -> tuple[Slab, ...]:
    return tuple(
        Slab(width=None if width is None else Decimal(width), rate=Decimal(rate), label=label)
        for width, rate, label in rows
    )


# ── FY 2082-83 ────────────────────────────────────────────────────────
# The structure the prototype's own prior-year table used, with the 1% first band it
# omitted. The 1% is the social security tax, and it does not apply to someone already
# contributing to the SSF — `contributes_to_ssf` on the payslip input controls that.
FY_2082_83 = TaxScale(
    single=_slabs(
        ("500000", "0.01", "First NPR 5 lakh"),
        ("200000", "0.10", "Next NPR 2 lakh"),
        ("300000", "0.20", "Next NPR 3 lakh"),
        ("1000000", "0.30", "Next NPR 10 lakh"),
        (None, "0.36", "Above NPR 20 lakh"),
    ),
    married=_slabs(
        ("600000", "0.01", "First NPR 6 lakh"),
        ("200000", "0.10", "Next NPR 2 lakh"),
        ("300000", "0.20", "Next NPR 3 lakh"),
        ("900000", "0.30", "Next NPR 9 lakh"),
        (None, "0.36", "Above NPR 20 lakh"),
    ),
)

# ── FY 2083-84 ────────────────────────────────────────────────────────
# Carried forward from 2082-83 deliberately. The prototype's 2083-84 single table is
# internally inconsistent (see the note above), so copying it would import a number that
# is probably wrong; carrying the previous year forward is at least a defensible default
# and makes the "this needs verifying" flag honest rather than decorative.
FY_2083_84 = FY_2082_83

SCALES: dict[str, TaxScale] = {
    "2082-83": FY_2082_83,
    "2083-84": FY_2083_84,
}

# ── SSF (Social Security Fund) ────────────────────────────────────────
# 31% of basic in total: the employee contributes 11%, the employer 20%. The prototype
# charged the employee the employer's 20%.
SSF_EMPLOYEE_RATE = Decimal("0.11")
SSF_EMPLOYER_RATE = Decimal("0.20")

# ── Deduction ceilings ────────────────────────────────────────────────
# A retirement-fund contribution is relieved at the lowest of: what was actually paid,
# a third of assessable income, and this absolute cap.
RETIREMENT_FUND_CAP = Decimal("500000")
RETIREMENT_FUND_FRACTION = Decimal("3")
LIFE_INSURANCE_CAP = Decimal("40000")
HEALTH_INSURANCE_CAP = Decimal("20000")

# Income Tax Act s.88: a resident woman with only employment income takes a 10% rebate
# on the tax otherwise payable.
FEMALE_REBATE = Decimal("0.10")


def apply_slabs(taxable: Decimal, slabs: tuple[Slab, ...]) -> tuple[Decimal, list[dict]]:
    """Walk the progressive scale, returning the tax and a band-by-band breakdown.

    The breakdown is not decoration: a payslip that says only "tax: 14,200" is a payslip
    nobody can check, and the first thing anyone disputing their pay asks is which band
    the money fell in.
    """
    remaining = max(ZERO, taxable)
    total = ZERO
    breakdown: list[dict] = []

    for slab in slabs:
        if remaining <= ZERO:
            break
        chunk = remaining if slab.width is None else min(remaining, slab.width)
        tax = money(chunk * slab.rate)
        total += tax
        breakdown.append(
            {
                "label": slab.label,
                "rate": slab.rate,
                "amount": money(chunk),
                "tax": tax,
            }
        )
        remaining -= chunk

    return money(total), breakdown


def retirement_fund_allowance(
    *, contributed: Decimal, assessable: Decimal, cap: Decimal = RETIREMENT_FUND_CAP
) -> Decimal:
    """The lowest of what was paid, a third of assessable income, and the cap."""
    return money(min(contributed, assessable / RETIREMENT_FUND_FRACTION, cap))
