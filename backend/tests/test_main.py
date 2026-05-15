from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


# --- Issue A: バグ修正テスト ---

def test_create_transaction_with_invalid_category_returns_404():
    """存在しないカテゴリIDで取引登録→404を返すこと（旧: 400）"""
    response = client.post("/transactions", json={
        "type": "expense",
        "amount": 100,
        "date": "2026-01-01",
        "category_id": 99999,
        "recurring": "none",
    })
    assert response.status_code == 404
    assert response.json()["detail"] == "カテゴリが見つかりません"


def test_delete_default_category_returns_japanese_error():
    """デフォルトカテゴリ削除→日本語エラーメッセージを返すこと"""
    response = client.delete("/categories/1")
    assert response.status_code == 403
    assert "デフォルト" in response.json()["detail"]


def test_create_duplicate_category_returns_japanese_error():
    """同名カテゴリ重複登録→日本語エラーを返すこと"""
    response = client.post("/categories", json={
        "name": "食費",
        "color": "#ff0000",
        "type": "expense",
    })
    assert response.status_code == 409
    assert "同名" in response.json()["detail"]


# --- Issue B: コード品質改善テスト ---

def test_categories_is_default_is_boolean():
    """GET /categories → is_default が bool 型であること"""
    response = client.get("/categories")
    assert response.status_code == 200
    cats = response.json()
    assert len(cats) > 0
    assert isinstance(cats[0]["is_default"], bool)


def test_categories_always_includes_subcategories():
    """GET /categories は常にサブカテゴリ付きで返すこと"""
    response = client.get("/categories")
    assert response.status_code == 200
    cats = response.json()
    assert len(cats) > 0
    assert "subcategories" in cats[0]
