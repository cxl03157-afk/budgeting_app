from datetime import date, datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field


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


class TransactionCreateSchema(BaseModel):
    type: Literal["income", "expense"]
    amount: int = Field(gt=0)
    date: date
    category_id: int = Field(gt=0)
    subcategory_id: int | None = None
    memo: str | None = Field(None, max_length=100)
    recurring: Literal["none", "weekly", "monthly"] = "none"


class TransactionListResponse(BaseModel):
    items: list[TransactionResponse]
    total_income: int    # フィルター後の収入合計
    total_expense: int   # フィルター後の支出合計
    balance: int         # フィルター後の残高（total_income - total_expense）


class CategoryCreateSchema(BaseModel):
    name: str = Field(min_length=1, max_length=20)
    color: str = Field(pattern=r'^#[0-9a-fA-F]{6}$')
    type: Literal["income", "expense"]


class SubcategoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


class CategoryWithSubsResponse(CategoryResponse):
    subcategories: list[SubcategoryResponse] = []


class SubcategoryCreateSchema(BaseModel):
    name: str = Field(min_length=1, max_length=30)


class BudgetCreateSchema(BaseModel):
    year: int = Field(ge=2000, le=2100)
    month: int = Field(ge=1, le=12)
    amount: int = Field(gt=0)


class BudgetUpdateSchema(BaseModel):
    amount: int = Field(gt=0)


class BudgetResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    year: int
    month: int
    amount: int


class MonthlyBudgetRow(BaseModel):
    month: int
    budget_id: int | None
    amount: int | None
    actual_expense: int
