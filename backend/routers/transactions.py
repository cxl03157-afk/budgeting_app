from datetime import date
from typing import Literal
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models import Transaction
from schemas import TransactionListResponse, TransactionResponse

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("", response_model=TransactionListResponse)
def list_transactions(
    type: Literal["income", "expense"] | None = Query(None),
    category_id: int | None = Query(None, ge=1),
    year: int | None = Query(None, ge=2000, le=2100),
    month: int | None = Query(None, ge=1, le=12),
    db: Session = Depends(get_db),
):
    q = db.query(Transaction)

    if type is not None:
        q = q.filter(Transaction.type == type)

    if category_id is not None:
        q = q.filter(Transaction.category_id == category_id)

    # idx_date を活用するため MONTH() 関数ではなく範囲比較を使う
    if year is not None and month is not None:
        import calendar
        _, last_day = calendar.monthrange(year, month)
        date_from = date(year, month, 1)
        next_month = month % 12 + 1
        next_year = year + (1 if month == 12 else 0)
        date_to = date(next_year, next_month, 1)
        q = q.filter(Transaction.date >= date_from, Transaction.date < date_to)
    elif year is not None:
        date_from = date(year, 1, 1)
        date_to = date(year + 1, 1, 1)
        q = q.filter(Transaction.date >= date_from, Transaction.date < date_to)

    transactions = q.order_by(Transaction.date.desc()).all()

    total_income = sum(t.amount for t in transactions if t.type == "income")
    total_expense = sum(t.amount for t in transactions if t.type == "expense")

    return TransactionListResponse(
        items=transactions,
        total_income=total_income,
        total_expense=total_expense,
        balance=total_income - total_expense,
    )
