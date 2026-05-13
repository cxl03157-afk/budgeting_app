from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import categories, transactions

app = FastAPI(title="Budgeting App API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(categories.router)
app.include_router(transactions.router)


@app.get("/health")
def health_check():
    return {"status": "ok"}
