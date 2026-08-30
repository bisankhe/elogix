"""One full-and-final settlement, computed.

A pure function over `Decimal`, for the same reason `payroll/compute.py` is one: this is
a number a person will sit down and check by hand, usually a person who has just lost
their job and has fifteen days to be paid. Anything that makes checking harder — an ORM
in the middle, a float, a figure with no stated basis — is a defect in itself.

**Every line carries its own reason.** `SettlementLine.basis` is not decoration; it is
the difference between "gratuity: 0.00" and "gratuity: nil, because it was already paid
monthly into SSF". The first starts an argument, the second ends one.

**Tax is charged at the marginal rate, not annualised.** A settlement is one-off income
in a fiscal year that is already part-taxed. Running it through the annual slabs on its
own would tax it as if it were the person's whole year — far too little. Annualising it
by twelve, the way the prototype annualised incentives, would tax it as if they earned
it every month — far too much. What is correct is the difference: tax on
(year-to-date taxable + this settlement) less tax already withheld year-to-date. That is
the only one of the three that a leaver's own tax return will agree with.

Who owed whom notice is a real distinction and it changes the sign. An employer who
terminates without notice *pays* for it; an employee who walks out without serving it
*owes* for it. `ExitInitiator` is what decides, and getting it backwards moves money in
the wrong direction.
"""

import enum
from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal

from elogix_api.nepal import settlement as statutory
from elogix_api.nepal.tax import ZERO, Slab, apply_slabs, money


class ExitInitiator(enum.StrEnum):
    """Who ended the employment. Decides which way notice pay flows."""

    EMPLOYEE = "employee"
    EMPLOYER = "employer"
    # Contract expiry, retirement, death in service — nobody failed to give notice, so
    # no notice line arises at all.
    NEITHER = "neither"


class LineKind(enum.StrEnum):
    EARNING = "earning"
    DEDUCTION = "deduction"


@dataclass(frozen=True, slots=True)
class SettlementLine:
    kind: LineKind
    code: str
    label: str
    amount: Decimal
    # Why this figure is this figure. Shown to the employee, stored on the record.
    basis: str
    taxable: bool = True


@dataclass(frozen=True, slots=True)
class LeaveBalance:
    """One encashable leave balance at the moment of exit."""

    leave_type_id: str
    code: str
    name: str
    days: Decimal


@dataclass(frozen=True, slots=True)
class Adjustment:
    """A line HR adds by hand — a salary advance, an unreturned laptop, a retention bonus.

    These exist because the alternative is worse. Without them the settlement is
    approximately right and gets corrected in a spreadsheet, which is how a system stops
    being the record. Every one carries a reason for the same reason every other line
    does.
    """

    kind: LineKind
    label: str
    amount: Decimal
    reason: str
    taxable: bool = True


@dataclass(frozen=True, slots=True)
class SettlementInput:
    """Everything one settlement needs, and nothing that has to be looked up."""

    basic: Decimal
    joined_on: date
    last_working_day: date
    contributes_to_ssf: bool
    initiator: ExitInitiator

    # Salary earned since the last payroll run that actually paid this person.
    unpaid_days: Decimal = ZERO
    month_days: Decimal = Decimal("30")
    unpaid_from: date | None = None

    # Balances of leave types the company marks encashable.
    encashable_leave: tuple[LeaveBalance, ...] = ()

    # From the employment category, and from the resignation record.
    notice_days_required: int = 0
    notice_days_served: int = 0

    adjustments: tuple[Adjustment, ...] = ()

    # The fiscal year so far, from this employee's own payslips. Both are needed: the
    # marginal rate depends on income already earned, and the amount to withhold now
    # depends on what has already been withheld.
    ytd_taxable: Decimal = ZERO
    ytd_tax_withheld: Decimal = ZERO


@dataclass
class Settlement:
    lines: list[SettlementLine] = field(default_factory=list)

    gross_earnings: Decimal = ZERO
    taxable_earnings: Decimal = ZERO
    total_deductions: Decimal = ZERO
    tax: Decimal = ZERO
    net_payable: Decimal = ZERO

    deadline: date | None = None
    notes: list[str] = field(default_factory=list)


def compute_settlement(
    data: SettlementInput, *, slabs: tuple[Slab, ...] | None = None
) -> Settlement:
    """Everything owed when employment ends, itemised.

    `slabs` overrides the statutory defaults with the company's own editable rows, the
    same way `compute_payslip` does. Omitted, `nepal/tax.py` applies — and those slabs
    are still unverified.
    """
    result = Settlement(deadline=statutory.deadline(data.last_working_day))
    daily = data.basic / data.month_days if data.month_days else ZERO

    # ── Salary earned but not yet paid ────────────────────────────────
    if data.unpaid_days > ZERO:
        since = f" since {data.unpaid_from.isoformat()}" if data.unpaid_from else ""
        result.lines.append(
            SettlementLine(
                kind=LineKind.EARNING,
                code="UNPAID_SALARY",
                label="Salary earned, not yet paid",
                amount=money(daily * data.unpaid_days),
                basis=(
                    f"{data.unpaid_days} payable day(s){since} through "
                    f"{data.last_working_day.isoformat()}, at basic / {data.month_days} "
                    f"per day."
                ),
            )
        )

    # ── Leave encashment ──────────────────────────────────────────────
    #
    # Paid at the same daily rate as salary. Every balance is consumed here, which is
    # why the caller must post the matching ledger entries in the same transaction —
    # a balance that survives being paid out can be paid out again.
    for balance in data.encashable_leave:
        if balance.days <= ZERO:
            continue
        result.lines.append(
            SettlementLine(
                kind=LineKind.EARNING,
                code=f"LEAVE_ENCASH_{balance.code}",
                label=f"{balance.name} encashment",
                amount=money(daily * balance.days),
                basis=(
                    f"{balance.days} unused day(s) of {balance.name} at basic / "
                    f"{data.month_days} per day."
                ),
            )
        )

    # ── Gratuity ──────────────────────────────────────────────────────
    #
    # Nil for an SSF contributor, and the reason is recorded rather than left as a
    # bare zero. See `nepal/settlement.py`.
    gratuity_amount, gratuity_basis = statutory.gratuity(
        basic=data.basic,
        joined_on=data.joined_on,
        last_working_day=data.last_working_day,
        contributes_to_ssf=data.contributes_to_ssf,
    )
    result.lines.append(
        SettlementLine(
            kind=LineKind.EARNING,
            code="GRATUITY",
            label="Gratuity",
            amount=money(gratuity_amount),
            basis=gratuity_basis,
        )
    )

    # ── Notice ────────────────────────────────────────────────────────
    #
    # The sign depends on who ended it. Getting this backwards moves money the wrong
    # way, so the initiator is required input rather than an assumption.
    if data.initiator is not ExitInitiator.NEITHER:
        notice_amount, notice_basis = statutory.notice_pay(
            basic=data.basic,
            notice_days=data.notice_days_required,
            days_served=data.notice_days_served,
        )
        if notice_amount > ZERO:
            employer_pays = data.initiator is ExitInitiator.EMPLOYER
            result.lines.append(
                SettlementLine(
                    kind=LineKind.EARNING if employer_pays else LineKind.DEDUCTION,
                    code="NOTICE_PAY",
                    label="Pay in lieu of notice"
                    if employer_pays
                    else "Notice not served",
                    amount=money(notice_amount),
                    basis=(
                        f"{notice_basis} The employer ended the employment, so this is "
                        "owed to the employee."
                        if employer_pays
                        else f"{notice_basis} The employee resigned without serving it, "
                        "so it is recovered."
                    ),
                )
            )

    # ── Manual adjustments ────────────────────────────────────────────
    for adjustment in data.adjustments:
        result.lines.append(
            SettlementLine(
                kind=adjustment.kind,
                code="ADJUSTMENT",
                label=adjustment.label,
                amount=money(adjustment.amount),
                basis=adjustment.reason,
                taxable=adjustment.taxable,
            )
        )

    # ── Totals ────────────────────────────────────────────────────────
    earnings = [line for line in result.lines if line.kind is LineKind.EARNING]
    result.gross_earnings = money(sum((line.amount for line in earnings), ZERO))
    result.taxable_earnings = money(
        sum((line.amount for line in earnings if line.taxable), ZERO)
    )
    result.total_deductions = money(
        sum(
            (line.amount for line in result.lines if line.kind is LineKind.DEDUCTION),
            ZERO,
        )
    )

    # ── Tax ───────────────────────────────────────────────────────────
    #
    # The marginal charge: what the year's tax becomes with this settlement in it, less
    # what has already been withheld. Never negative — if the year was over-withheld,
    # that is a refund the tax office settles on the annual return, not something an
    # employer nets off a final payment.
    if slabs is None:
        from elogix_api.nepal import tax as statutory_tax

        slabs = statutory_tax.FY_2082_83.single

    tax_with, _ = apply_slabs(data.ytd_taxable + result.taxable_earnings, slabs)
    tax_without, _ = apply_slabs(data.ytd_taxable, slabs)
    marginal = max(ZERO, tax_with - tax_without)

    # Any shortfall in what was withheld across the year is collected here too — this
    # is the last payment, so there is no later one to correct it in.
    shortfall = max(ZERO, tax_without - data.ytd_tax_withheld)
    result.tax = money(marginal + shortfall)

    if shortfall > ZERO:
        result.notes.append(
            f"Includes {money(shortfall)} of tax under-withheld earlier in the year; "
            "this is the last payment in which it can be collected."
        )

    result.net_payable = money(
        result.gross_earnings - result.total_deductions - result.tax
    )

    if result.net_payable < ZERO:
        result.notes.append(
            "Deductions exceed what is owed. This settlement is a net recovery from the "
            "employee, which needs a human decision rather than an automatic payment."
        )

    return result
