from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from sqlalchemy import text
from app.db.base import Base
from app.db.session import engine, SessionLocal

# --- 1. Import ALL models (Crucial for create_all) ---
from app.models.user import User
from app.models.specification import APISpecification
from app.models.governance_report import GovernanceReport
from app.models.audit_results import StructuralReport, ViolationDetail
from app.models.ai_analysis import SemanticAnalysis

# --- 2. Import Routers ---
from app.api.v1.endpoints import specs
from app.api.v1.endpoints import auth
from app.core.security import hash_password

# --- 3. Lifespan Handler ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- Startup Logic ---
    
    # Enable PGVector extension before creating tables
    try:
        with engine.connect() as conn:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
            conn.commit()
            print("🧠 PGVector extension verified.")
    except Exception as e:
        print(f"⚠️ Vector Extension Error: {e}")

    # Now create tables (Postgres now knows what 'vector' is)
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        admin_user = db.query(User).filter(User.id == 1).first()
        if not admin_user:
            new_user = User(
                id=1,
                username="biat_admin",
                email="admin@biat.com.tn",
                password_hash=hash_password("biat6767"),
                role="ADMIN",
                department="IT_GOVERNANCE"
            )
            db.add(new_user)
            db.commit()
            print("🚀 System User created with secure credentials.")
        elif admin_user.password_hash == "system_managed_hash":
            admin_user.password_hash = hash_password("biat6767")
            db.commit()
            print("🔐 System User password upgraded to bcrypt hash.")
    except Exception as e:
        print(f"⚠️ Startup User Error: {e}")
    finally:
        db.close()
    
    yield  # Application runs
    
    print("Shutting down Governance Engine...")

app = FastAPI(
    title="BIAT-IT | AI-Driven API Governance",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(specs.router, prefix="/api/v1/specs", tags=["Specifications"])

@app.get("/")
def read_root():
    return {"status": "online", "docs": "/docs"}