from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import extract, func
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from database import get_db
from models import Budget, Transaction
from schemas import BudgetCreateSchema, BudgetUpdateSchema, BudgetResponse, MonthlyBudgetRow

router = APIRouter(prefix="/budgets", tags=["budgets"])


@router.get("", response_model=list[MonthlyBudgetRow])
def list_budgets(
    year: int = Query(default=None, ge=2000, le=2100),
    db: Session = Depends(get_db),
):
    if year is None:
        year = datetime.now().year

    budgets = db.query(Budget).filter(Budget.year == year).all()
    budget_by_month = {b.month: b for b in budgets}

    expense_rows = (
        db.query(
            extract("month", Transaction.date).label("month"),
            func.sum(Transaction.amount).label("total"),
        )
        .filter(
            Transaction.type == "expense",
            Transaction.date >= date(year, 1, 1),
            Transaction.date < date(year + 1, 1, 1),
        )
        .group_by(extract("month", Transaction.date))
        .all()
    )
    expense_by_month = {int(row.month): int(row.total) for row in expense_rows}

    return [
        MonthlyBudgetRow(
            month=m,
            budget_id=budget_by_month[m].id if m in budget_by_month else None,
            amount=budget_by_month[m].amount if m in budget_by_month else None,
            actual_expense=expense_by_month.get(m, 0),
        )
        for m in range(1, 13)
    ]


@router.post("", response_model=BudgetResponse, status_code=201)
def create_budget(body: BudgetCreateSchema, db: Session = Depends(get_db)):
    existing = db.query(Budget).filter(Budget.year == body.year, Budget.month == body.month).first()
    if existing is not None:
        raise HTTPException(status_code=409, detail="その年月の予算は既に設定されています")

    now = datetime.now()
    budget = Budget(year=body.year, month=body.month, amount=body.amount, created_at=now, updated_at=now)
    db.add(budget)
    try:
        db.commit()
        db.refresh(budget)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="その年月の予算は既に設定されています")
    return budget


@router.put("/{budget_id}", response_model=BudgetResponse)
def update_budget(budget_id: int, body: BudgetUpdateSchema, db: Session = Depends(get_db)):
    budget = db.get(Budget, budget_id)
    if budget is None:
        raise HTTPException(status_code=404, detail="予算が見つかりません")
    budget.amount = body.amount
    budget.updated_at = datetime.now()
    db.commit()
    db.refresh(budget)
    return budget


@router.delete("/{budget_id}", status_code=204)
def delete_budget(budget_id: int, db: Session = Depends(get_db)):
    budget = db.get(Budget, budget_id)
    if budget is None:
        raise HTTPException(status_code=404, detail="予算が見つかりません")
    db.delete(budget)
    db.commit()
