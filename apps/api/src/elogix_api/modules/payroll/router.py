"""Payroll endpoints: components, salary structures, tax scales, runs and payslips."""

import uuid
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from elogix_api.core.deps import CurrentUserDep, DbDep, require_module
from elogix_api.core.entitlements import ModuleCode
from elogix_api.modules.employee.service import get_employee
from elogix_api.modules.payroll import service
from elogix_api.modules.payroll.models import (
    EmployeeSalary,
    EmployeeSalaryLine,
    PayrollRun,
    Payslip,
    PayslipLine,
    PayslipTaxBand,
    SalaryComponent,
    TaxScale,
    TaxSlab,
)
from elogix_api.modules.payroll.schemas import (
    ApprovalResult,
    ComponentCreate,
    ComponentOut,
    PayslipDetail,
    PayslipLineOut,
    PayslipOut,
    RunCreate,
    RunOut,
    RunResult,
    SalaryOut,
    SalarySet,
    SlabOut,
    TaxBandOut,
    TaxScaleOut,
    TaxScaleUpdate,
)

router = APIRouter(
    prefix="/payroll",
    tags=["payroll"],
    dependencies=[Depends(require_module(ModuleCode.PAYROLL))],
)


# ── Components ────────────────────────────────────────────────────────


@router.get("/components", response_model=list[ComponentOut])
def list_components(user: CurrentUserDep, db: DbDep) -> list[SalaryComponent]:
    return list(
        db.execute(
            select(SalaryComponent)
            .where(
                SalaryComponent.company_id == user.company_id,
                SalaryComponent.is_active.is_(True),
            )
            .order_by(SalaryComponent.code)
        )
        .scalars()
        .all()
    )


@router.post("/components", response_model=ComponentOut, status_code=status.HTTP_201_CREATED)
def create_component(
    payload: ComponentCreate, user: CurrentUserDep, db: DbDep
) -> SalaryComponent:
    row = SalaryComponent(company_id=user.company_id, **payload.model_dump())
    db.add(row)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT, "A component with this code already exists"
        ) from exc
    db.refresh(row)
    return row


# ── Salary ────────────────────────────────────────────────────────────


@router.get("/salaries/{employee_id}", response_model=list[SalaryOut])
def salary_history(
    employee_id: uuid.UUID, user: CurrentUserDep, db: DbDep
) -> list[EmployeeSalary]:
    """Every salary period, newest first — a raise opens a row, never edits one."""
    get_employee(db, company_id=user.company_id, employee_id=employee_id)
    return list(
        db.execute(
            select(EmployeeSalary)
            .where(
                EmployeeSalary.company_id == user.company_id,
                EmployeeSalary.employee_id == employee_id,
            )
            .order_by(EmployeeSalary.effective_from.desc())
        )
        .scalars()
        .all()
    )


@router.post(
    "/salaries/{employee_id}", response_model=SalaryOut, status_code=status.HTTP_201_CREATED
)
def set_salary(
    employee_id: uuid.UUID, payload: SalarySet, user: CurrentUserDep, db: DbDep
) -> EmployeeSalary:
    get_employee(db, company_id=user.company_id, employee_id=employee_id)

    row = service.set_salary(
        db,
        company_id=user.company_id,
        employee_id=employee_id,
        basic=payload.basic,
        effective_from=payload.effective_from,
        contributes_to_ssf=payload.contributes_to_ssf,
        life_insurance_premium=payload.life_insurance_premium,
        health_insurance_premium=payload.health_insurance_premium,
        note=payload.note,
    )
    db.flush()

    for line in payload.lines:
        component = db.execute(
            select(SalaryComponent).where(
                SalaryComponent.id == line.salary_component_id,
                SalaryComponent.company_id == user.company_id,
            )
        ).scalar_one_or_none()
        if component is None:
            db.rollback()
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Salary component not found")
        db.add(
            EmployeeSalaryLine(
                company_id=user.company_id,
                employee_salary_id=row.id,
                salary_component_id=component.id,
                amount=line.amount,
            )
        )

    db.commit()
    db.refresh(row)
    return row


# ── Tax scales ────────────────────────────────────────────────────────


@router.get("/tax-scales", response_model=list[TaxScaleOut])
def list_tax_scales(user: CurrentUserDep, db: DbDep) -> list[TaxScaleOut]:
    """The company's own bands. Seeded from unverified statutory defaults."""
    service.seed_tax_scales(db, company_id=user.company_id)

    out: list[TaxScaleOut] = []
    for scale in db.execute(
        select(TaxScale)
        .where(TaxScale.company_id == user.company_id)
        .order_by(TaxScale.fiscal_year, TaxScale.is_married)
    ).scalars():
        slabs = [
            SlabOut.model_validate(row)
            for row in db.execute(
                select(TaxSlab)
                .where(TaxSlab.tax_scale_id == scale.id)
                .order_by(TaxSlab.sequence)
            ).scalars()
        ]
        out.append(
            TaxScaleOut(
                id=scale.id,
                fiscal_year=scale.fiscal_year,
                is_married=scale.is_married,
                is_verified=scale.is_verified,
                verified_by=scale.verified_by,
                verified_on=scale.verified_on,
                slabs=slabs,
            )
        )
    return out


@router.put("/tax-scales/{scale_id}", response_model=TaxScaleOut)
def update_tax_scale(
    scale_id: uuid.UUID, payload: TaxScaleUpdate, user: CurrentUserDep, db: DbDep
) -> TaxScaleOut:
    """Replace a scale's bands, and record who checked them.

    Naming a verifier is what flips `is_verified`. That is deliberate: "verified" should
    mean a person put their name to it, not that someone clicked a box.
    """
    scale = db.execute(
        select(TaxScale).where(
            TaxScale.id == scale_id, TaxScale.company_id == user.company_id
        )
    ).scalar_one_or_none()
    if scale is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tax scale not found")

    for old in db.execute(
        select(TaxSlab).where(TaxSlab.tax_scale_id == scale.id)
    ).scalars():
        db.delete(old)
    db.flush()

    for index, slab in enumerate(payload.slabs):
        db.add(
            TaxSlab(
                company_id=user.company_id,
                tax_scale_id=scale.id,
                sequence=index,
                width=slab.width,
                rate=slab.rate,
                label=slab.label,
            )
        )

    if payload.verified_by:
        scale.is_verified = True
        scale.verified_by = payload.verified_by
        scale.verified_on = date.today()

    db.commit()
    return _scale_out(db, user.company_id, scale)


# ── Runs ──────────────────────────────────────────────────────────────


@router.get("/runs", response_model=list[RunOut])
def list_runs(user: CurrentUserDep, db: DbDep) -> list[PayrollRun]:
    return list(
        db.execute(
            select(PayrollRun)
            .where(PayrollRun.company_id == user.company_id)
            .order_by(PayrollRun.period_start.desc())
        )
        .scalars()
        .all()
    )


@router.post("/runs", response_model=RunOut, status_code=status.HTTP_201_CREATED)
def create_run(payload: RunCreate, user: CurrentUserDep, db: DbDep) -> PayrollRun:
    if payload.period_end < payload.period_start:
        raise HTTPException(status.HTTP_409_CONFLICT, "The period ends before it starts")

    run = PayrollRun(company_id=user.company_id, **payload.model_dump())
    db.add(run)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT, "A run already exists for that period"
        ) from exc
    db.refresh(run)
    return run


@router.post("/runs/{run_id}/compute", response_model=RunResult)
def compute_run(run_id: uuid.UUID, user: CurrentUserDep, db: DbDep) -> RunResult:
    run = _get_run(db, run_id, user.company_id)
    return RunResult(payslips_written=service.compute_run(db, run=run))


@router.post("/runs/{run_id}/approve", response_model=ApprovalResult)
def approve_run(run_id: uuid.UUID, user: CurrentUserDep, db: DbDep) -> ApprovalResult:
    """Approve, and lock the attendance the run was computed from."""
    run = _get_run(db, run_id, user.company_id)
    locked = service.approve_run(db, run=run, user_id=user.id)
    return ApprovalResult(attendance_days_locked=locked)


@router.get("/runs/{run_id}/payslips", response_model=list[PayslipOut])
def list_payslips(
    run_id: uuid.UUID,
    user: CurrentUserDep,
    db: DbDep,
    employee_id: Annotated[uuid.UUID | None, Query()] = None,
) -> list[Payslip]:
    _get_run(db, run_id, user.company_id)
    stmt = select(Payslip).where(
        Payslip.payroll_run_id == run_id, Payslip.company_id == user.company_id
    )
    if employee_id is not None:
        stmt = stmt.where(Payslip.employee_id == employee_id)
    return list(db.execute(stmt).scalars().all())


@router.get("/payslips/{payslip_id}", response_model=PayslipDetail)
def get_payslip(payslip_id: uuid.UUID, user: CurrentUserDep, db: DbDep) -> PayslipDetail:
    """One payslip with every line and every tax band it was built from."""
    payslip = db.execute(
        select(Payslip).where(
            Payslip.id == payslip_id, Payslip.company_id == user.company_id
        )
    ).scalar_one_or_none()
    if payslip is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Payslip not found")

    detail = PayslipDetail.model_validate(payslip)
    detail.lines = [
        PayslipLineOut.model_validate(row)
        for row in db.execute(
            select(PayslipLine)
            .where(PayslipLine.payslip_id == payslip.id)
            .order_by(PayslipLine.kind, PayslipLine.sequence)
        ).scalars()
    ]
    detail.tax_bands = [
        TaxBandOut.model_validate(row)
        for row in db.execute(
            select(PayslipTaxBand)
            .where(PayslipTaxBand.payslip_id == payslip.id)
            .order_by(PayslipTaxBand.sequence)
        ).scalars()
    ]
    return detail


def _get_run(db: DbDep, run_id: uuid.UUID, company_id: uuid.UUID) -> PayrollRun:
    run = db.execute(
        select(PayrollRun).where(
            PayrollRun.id == run_id, PayrollRun.company_id == company_id
        )
    ).scalar_one_or_none()
    if run is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Payroll run not found")
    return run


def _scale_out(db: DbDep, company_id: uuid.UUID, scale: TaxScale) -> TaxScaleOut:
    slabs = [
        SlabOut.model_validate(row)
        for row in db.execute(
            select(TaxSlab)
            .where(TaxSlab.tax_scale_id == scale.id)
            .order_by(TaxSlab.sequence)
        ).scalars()
    ]
    return TaxScaleOut(
        id=scale.id,
        fiscal_year=scale.fiscal_year,
        is_married=scale.is_married,
        is_verified=scale.is_verified,
        verified_by=scale.verified_by,
        verified_on=scale.verified_on,
        slabs=slabs,
    )
