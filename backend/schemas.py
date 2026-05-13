from datetime import date, datetime
from pydantic import BaseModel, ConfigDict


class CategoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    color: str
    type: str
    is_default: int


class TransactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    type: str
    amount: int
    date: date
    category_id: int
    subcategory_id: int | None
    memo: str | None
    recurring: str
    auto_generated: int


class TransactionListResponse(BaseModel):
    items: list[TransactionResponse]
    total_income: int    # フィルター後の収入合計
    total_expense: int   # フィルター後の支出合計
    balance: int         # フィルター後の残高（total_income - total_expense）
