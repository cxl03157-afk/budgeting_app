from datetime import date, datetime
from sqlalchemy import Boolean, Date, DateTime, Enum, ForeignKey, Index, Integer, SmallInteger, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(20), nullable=False)
    color: Mapped[str] = mapped_column(String(7), nullable=False, default="#6366f1")
    type: Mapped[str] = mapped_column(Enum("income", "expense"), nullable=False)
    is_default: Mapped[int] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    subcategories: Mapped[list["Subcategory"]] = relationship(back_populates="category")
    transactions: Mapped[list["Transaction"]] = relationship(back_populates="category")


class Subcategory(Base):
    __tablename__ = "subcategories"
    __table_args__ = (UniqueConstraint("category_id", "name", name="uq_cat_name"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(30), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    category: Mapped["Category"] = relationship(back_populates="subcategories")


class Transaction(Base):
    __tablename__ = "transactions"
    __table_args__ = (
        Index("idx_date", "date"),
        Index("idx_category", "category_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    type: Mapped[str] = mapped_column(Enum("income", "expense"), nullable=False)
    amount: Mapped[int] = mapped_column(Integer, nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id", ondelete="RESTRICT"), nullable=False)
    subcategory_id: Mapped[int | None] = mapped_column(ForeignKey("subcategories.id", ondelete="SET NULL"), nullable=True)
    memo: Mapped[str | None] = mapped_column(String(100), nullable=True)
    recurring: Mapped[str] = mapped_column(Enum("none", "weekly", "monthly"), nullable=False, default="none")
    auto_generated: Mapped[int] = mapped_column(Boolean, nullable=False, default=False)
    original_id: Mapped[int | None] = mapped_column(ForeignKey("transactions.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    category: Mapped["Category"] = relationship(back_populates="transactions")
    subcategory: Mapped["Subcategory | None"] = relationship()


class Budget(Base):
    __tablename__ = "budgets"
    __table_args__ = (UniqueConstraint("year", "month", name="uq_year_month"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    year: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    month: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    amount: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
