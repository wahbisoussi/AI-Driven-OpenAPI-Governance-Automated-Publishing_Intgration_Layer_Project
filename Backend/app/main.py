from fastapi import FastAPI
from app.api.v1.endpoints import specs
from app.db.base import Base
from app.db.session import engine

# This creates the tables in PostgreSQL if they don't exist
Base.metadata.create_all(bind=engine)

app = FastAPI(title="BIAT-IT |AI-Driven API Governance")

# Include the router
app.include_router(specs.router, prefix="/api/v1/specs", tags=["Specifications"])

@app.get("/")
def read_root():
    return {"message": "Governance Engine is Running"}