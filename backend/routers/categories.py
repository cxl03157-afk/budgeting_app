from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, selectinload
from sqlalchemy.exc import IntegrityError
from database import get_db
from models import Category, Subcategory
from schemas import (
    CategoryResponse,
    CategoryCreateSchema,
    CategoryUpdateSchema,
    CategoryWithSubsResponse,
    SubcategoryCreateSchema,
    SubcategoryUpdateSchema,
    SubcategoryResponse,
)

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", response_model=list[CategoryWithSubsResponse])
def list_categories(
    with_subcategories: bool = Query(False),
    db: Session = Depends(get_db),
):
    categories = (
        db.query(Category)
        .options(selectinload(Category.subcategories))
        .order_by(Category.id)
        .all()
    )
    return categories


@router.post("", response_model=CategoryResponse, status_code=201)
def create_category(body: CategoryCreateSchema, db: Session = Depends(get_db)):
    existing = (
        db.query(Category)
        .filter(Category.type == body.type, Category.name == body.name)
        .first()
    )
    if existing is not None:
        raise HTTPException(status_code=409, detail="同じ区分に同名のカテゴリが既に存在します")

    category = Category(
        name=body.name,
        color=body.color,
        type=body.type,
        is_default=False,
        created_at=datetime.now(),
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.put("/{category_id}", response_model=CategoryResponse)
def update_category(
    category_id: int,
    body: CategoryUpdateSchema,
    db: Session = Depends(get_db),
):
    category = db.get(Category, category_id)
    if category is None:
        raise HTTPException(status_code=404, detail="カテゴリが見つかりません")

    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="カテゴリ名を入力してください")

    duplicate = (
        db.query(Category)
        .filter(Category.name == name, Category.type == category.type, Category.id != category_id)
        .first()
    )
    if duplicate is not None:
        raise HTTPException(status_code=409, detail="同じ区分に同名のカテゴリが既に存在します")

    category.name = name
    category.color = body.color
    try:
        db.commit()
        db.refresh(category)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="更新に失敗しました")
    return category


@router.delete("/{category_id}", status_code=204)
def delete_category(category_id: int, db: Session = Depends(get_db)):
    category = db.get(Category, category_id)
    if category is None:
        raise HTTPException(status_code=404, detail="カテゴリが見つかりません")
    if category.is_default:
        raise HTTPException(status_code=403, detail="デフォルトカテゴリは削除できません")
    try:
        db.delete(category)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="このカテゴリを使用している取引があるため削除できません")


@router.post("/{category_id}/subcategories", response_model=SubcategoryResponse, status_code=201)
def create_subcategory(
    category_id: int,
    body: SubcategoryCreateSchema,
    db: Session = Depends(get_db),
):
    category = db.get(Category, category_id)
    if category is None:
        raise HTTPException(status_code=404, detail="カテゴリが見つかりません")

    subcategory = Subcategory(name=body.name, category_id=category_id, created_at=datetime.now())
    db.add(subcategory)
    try:
        db.commit()
        db.refresh(subcategory)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="同じカテゴリ内に同名のサブカテゴリが既に存在します")
    return subcategory


@router.put("/{category_id}/subcategories/{sub_id}", response_model=SubcategoryResponse)
def update_subcategory(
    category_id: int,
    sub_id: int,
    body: SubcategoryUpdateSchema,
    db: Session = Depends(get_db),
):
    category = db.get(Category, category_id)
    if category is None:
        raise HTTPException(status_code=404, detail="カテゴリが見つかりません")

    subcategory = db.get(Subcategory, sub_id)
    if subcategory is None or subcategory.category_id != category_id:
        raise HTTPException(status_code=404, detail="サブカテゴリが見つかりません")

    new_name = body.name.strip()
    if not new_name:
        raise HTTPException(status_code=400, detail="サブカテゴリ名を入力してください")

    if subcategory.name == new_name:
        return subcategory

    duplicate = (
        db.query(Subcategory)
        .filter(Subcategory.category_id == category_id, Subcategory.name == new_name)
        .first()
    )
    if duplicate is not None:
        raise HTTPException(status_code=409, detail="同じカテゴリ内に同名のサブカテゴリが既に存在します")

    subcategory.name = new_name
    try:
        db.commit()
        db.refresh(subcategory)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="同じカテゴリ内に同名のサブカテゴリが既に存在します")
    return subcategory


@router.delete("/{category_id}/subcategories/{sub_id}", status_code=204)
def delete_subcategory(category_id: int, sub_id: int, db: Session = Depends(get_db)):
    category = db.get(Category, category_id)
    if category is None:
        raise HTTPException(status_code=404, detail="カテゴリが見つかりません")

    subcategory = db.get(Subcategory, sub_id)
    if subcategory is None or subcategory.category_id != category_id:
        raise HTTPException(status_code=404, detail="サブカテゴリが見つかりません")

    db.delete(subcategory)
    db.commit()
