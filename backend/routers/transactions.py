from datetime import date, datetime
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from database import get_db
from models import Category, Subcategory, Transaction
from schemas import TransactionCreateSchema, TransactionListResponse, TransactionResponse

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("", response_model=TransactionListResponse)
def list_transactions(
    type: Literal["income", "expense"] | None = Query(None),
    category_id: int | None = Query(None, ge=1),
    subcategory_id: int | None = Query(None, ge=1),
    year: int | None = Query(None, ge=2000, le=2100),
    month: int | None = Query(None, ge=1, le=12),
    week: int | None = Query(None, ge=1, le=5),
    db: Session = Depends(get_db),
):
    if week is not None and (year is None or month is None):
        raise HTTPException(status_code=400, detail="week には year と month の指定が必要です")

    q = db.query(Transaction)

    if type is not None:
        q = q.filter(Transaction.type == type)

    if category_id is not None:
        q = q.filter(Transaction.category_id == category_id)

    if subcategory_id is not None:
        q = q.filter(Transaction.subcategory_id == subcategory_id)

    # idx_date を活用するため MONTH() 関数ではなく範囲比較を使う
    # 週は暦週ではなく簡易週（第1週: 1〜7日, 第2週: 8〜14日, 第3週: 15〜21日, 第4週: 22〜28日, 第5週: 29日〜月末）
    if year is not None and month is not None:
        next_month = month % 12 + 1
        next_year = year + (1 if month == 12 else 0)
        if week is not None:
            week_starts = {1: 1, 2: 8, 3: 15, 4: 22, 5: 29}
            week_ends   = {1: 7, 2: 14, 3: 21, 4: 28}
            d_from = date(year, month, week_starts[week])
            d_to = date(next_year, next_month, 1) if week == 5 else date(year, month, week_ends[week] + 1)
        else:
            d_from = date(year, month, 1)
            d_to = date(next_year, next_month, 1)
        q = q.filter(Transaction.date >= d_from, Transaction.date < d_to)
    elif year is not None:
        q = q.filter(Transaction.date >= date(year, 1, 1), Transaction.date < date(year + 1, 1, 1))

    transactions = q.order_by(Transaction.date.desc()).all()

    total_income = sum(t.amount for t in transactions if t.type == "income")
    total_expense = sum(t.amount for t in transactions if t.type == "expense")

    return TransactionListResponse(
        items=transactions,
        total_income=total_income,
        total_expense=total_expense,
        balance=total_income - total_expense,
    )


def _validate_category(body: TransactionCreateSchema, db: Session) -> None:
    category = db.get(Category, body.category_id)
    if category is None:
        raise HTTPException(status_code=400, detail="category not found")
    if category.type != body.type:
        raise HTTPException(status_code=400, detail="category type does not match transaction type")
    if body.subcategory_id is not None:
        subcat = db.get(Subcategory, body.subcategory_id)
        if subcat is None:
            raise HTTPException(status_code=400, detail="subcategory not found")
        if subcat.category_id != body.category_id:
            raise HTTPException(status_code=400, detail="subcategory does not belong to category")


@router.post("", response_model=TransactionResponse, status_code=201)
def create_transaction(body: TransactionCreateSchema, db: Session = Depends(get_db)):
    _validate_category(body, db)

    now = datetime.now()
    tx = Transaction(**body.model_dump(), auto_generated=False, created_at=now, updated_at=now)
    try:
        db.add(tx)
        db.commit()
        db.refresh(tx)
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="database error")
    return tx


@router.put("/{transaction_id}", response_model=TransactionResponse)
def update_transaction(transaction_id: int, body: TransactionCreateSchema, db: Session = Depends(get_db)):
    tx = db.get(Transaction, transaction_id)
    if tx is None:
        raise HTTPException(status_code=404, detail="transaction not found")
    _validate_category(body, db)
    for k, v in body.model_dump().items():
        setattr(tx, k, v)
    tx.updated_at = datetime.now()
    try:
        db.commit()
        db.refresh(tx)
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="database error")
    return tx


@router.delete("/{transaction_id}", status_code=204)
def delete_transaction(transaction_id: int, db: Session = Depends(get_db)):
    # ハード削除: original_id FK は ON DELETE SET NULL のため参照整合性を保つ
    tx = db.get(Transaction, transaction_id)
    if tx is None:
        raise HTTPException(status_code=404, detail="transaction not found")
    try:
        db.delete(tx)
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="database error")
    # 204 No Content: レスポンスボディなし
