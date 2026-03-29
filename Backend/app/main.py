from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.db.base import Base
from app.db.session import engine, SessionLocal

# --- 1. Import ALL models ---
from app.models.user import User 
from app.models.specification import APISpecification
from app.models.governance_report import GovernanceReport
from app.models.audit_results import StructuralReport, ViolationDetail
from app.models.ai_analysis import SemanticAnalysis

# --- 2. Import Routers ---
from app.api.v1.endpoints import specs

# --- 3. Lifespan Handler (The modern way) ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- Startup Logic ---
    # Create tables
    Base.metadata.create_all(bind=engine)
    
    # Create default user for testing
    db = SessionLocal()
    try:
        admin_user = db.query(User).filter(User.id == 1).first()
        if not admin_user:
            new_user = User(id=1, username="biat_admin", email="admin@biat.com.tn")
            db.add(new_user)
            db.commit()
            print("🚀 System User (ID: 1) is ready.")
    except Exception as e:
        print(f"⚠️ Startup User Error: {e}")
    finally:
        db.close()
    
    yield  # The app runs while this is held
    
    # --- Shutdown Logic (Optional) ---
    print("Shutting down Governance Engine...")

# --- 4. FastAPI App Setup ---
app = FastAPI(
    title="BIAT-IT | AI-Driven API Governance",
    lifespan=lifespan  # Connect the lifespan here
)

# --- 5. Include Routes ---
app.include_router(specs.router, prefix="/api/v1/specs", tags=["Specifications"])

@app.get("/")
def read_root():
    return {"status": "online", "docs": "/docs"}