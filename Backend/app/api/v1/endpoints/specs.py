from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.services.governance_service import run_governance_pipeline
import shutil
import os

router = APIRouter()

@router.post("/upload")
async def upload_spec(file: UploadFile = File(...), db: Session = Depends(get_db)):
    # 1. Save uploaded file to disk temporarily
    temp_path = f"temp_{file.filename}"
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    try:
        # 2. Run the Governance Pipeline (Phase 1)
        with open(temp_path, "r") as f:
            content = f.read()
            
        result = run_governance_pipeline(
            db=db, 
            title=file.filename, 
            version="1.0.0", 
            content=content, 
            user_id=1 # Assuming a default user ID for now
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)