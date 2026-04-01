import shutil
import os
from typing import List
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from app.db.session import get_db
from app.services.governance_service import run_governance_pipeline
from app.models.specification import APISpecification
from app.models.governance_report import GovernanceReport
from app.models.schemas import WorkflowStatus, ManualReviewPayload, APISpecificationRead
from app.ai.llm_engine import LLMEngine 
from sqlalchemy import text # <--- Add this import at the top!


router = APIRouter()
llm_engine = LLMEngine() 

@router.post("/upload")
async def upload_spec(file: UploadFile = File(...), db: Session = Depends(get_db)):
    temp_path = f"temp_{file.filename}"
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    try:
        with open(temp_path, "r") as f:
            content = f.read()
            
        return run_governance_pipeline(
            db=db, 
            title=file.filename, 
            version="1.0.0", 
            content=content, 
            user_id=1
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

@router.post("/{spec_id}/apply-suggestions")
def handle_ai_suggestions(spec_id: int, accept: bool, db: Session = Depends(get_db)):
    spec = db.query(APISpecification).options(
        joinedload(APISpecification.semantic_analysis)
    ).filter(APISpecification.id == spec_id).first()
    
    if not spec:
        raise HTTPException(status_code=404, detail="Specification not found.")
    
    gov_report = db.query(GovernanceReport).filter(GovernanceReport.api_spec_id == spec_id).first()
    old_yaml = spec.raw_yaml 
    
    if accept:
        suggestion_text = getattr(spec.semantic_analysis, "ai_suggested_fix", "")
        
        if suggestion_text:
            fixed_yaml = llm_engine.apply_suggestion_to_yaml(spec.raw_yaml, suggestion_text)
            
            if "openapi" in fixed_yaml.lower():
                spec.raw_yaml = fixed_yaml 
        
        spec.suggestions_applied = True
        spec.workflow_status = WorkflowStatus.PROTOTYPE_READY
        reason = "Success: YAML refactored by AI."
    else:
        spec.suggestions_applied = False
        spec.workflow_status = WorkflowStatus.REJECTED
        reason = "Rejected: Developer declined AI fixes."

    if gov_report:
        gov_report.final_decision = spec.workflow_status.value
        gov_report.reason = reason

    db.commit()
    
    return {
        "status": spec.workflow_status.value, 
        "message": reason,
        "original_code_was": old_yaml,
        "updated_code_is": spec.raw_yaml
    }

@router.get("/all_specs", response_model=List[APISpecificationRead])
def get_all_specs(db: Session = Depends(get_db)):
    specs = db.query(APISpecification).options(
        joinedload(APISpecification.semantic_analysis)
    ).all()
    return specs if specs else []

@router.get("/{spec_id}", response_model=APISpecificationRead)
def get_spec_by_id(spec_id: int, db: Session = Depends(get_db)):
    spec = db.query(APISpecification).options(
        joinedload(APISpecification.semantic_analysis)
    ).filter(APISpecification.id == spec_id).first()
    
    if not spec:
        raise HTTPException(status_code=404, detail="OpenAPI Specification not found.")
    return spec

@router.delete("/{spec_id}")
def delete_spec(spec_id: int, db: Session = Depends(get_db)):
    spec = db.query(APISpecification).filter(APISpecification.id == spec_id).first()
    if not spec:
        raise HTTPException(status_code=404, detail="OpenAPI Specification not found.")
    db.delete(spec)
    db.commit()
    return {"detail": "OpenAPI Specification deleted successfully."}

# 4. DELETE ALL (Corrected for FastAPI)
@router.delete("/all/clear-database")
def delete_all_specs(db: Session = Depends(get_db)):
    try:
        # 1. Delete the deepest 'Grandchildren' first
        db.execute(text("DELETE FROM violation_details"))
        
        # 2. Delete the 'Children'
        db.execute(text("DELETE FROM structural_reports"))
        db.execute(text("DELETE FROM governance_reports"))
        db.execute(text("DELETE FROM semantic_analysis"))
        
        # 3. Finally, delete the 'Parents' (The YAML specs)
        # We use the model here to get the count of how many were deleted
        num_deleted = db.query(APISpecification).delete(synchronize_session=False)
        
        db.commit()
        return {
            "detail": f"System Purged. Deleted {num_deleted} specifications and all associated audit data.",
            "status": "SUCCESS"
        }
    except Exception as e:
        db.rollback()
        print(f"❌ Critical Wipe Error: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Database error: {str(e)}"
        )