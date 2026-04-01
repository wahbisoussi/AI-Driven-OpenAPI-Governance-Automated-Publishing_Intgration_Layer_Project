import shutil
import os
from typing import List
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from app.db.session import get_db
from app.services.governance_service import run_governance_pipeline
from app.models.specification import APISpecification
from app.models.governance_report import GovernanceReport
# Import the new Read schema
from app.models.schemas import WorkflowStatus, ManualReviewPayload, APISpecificationRead

router = APIRouter()

# 1. INITIAL UPLOAD
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

# 2. THE INTERACTIVE AI FIX LOOP
@router.post("/{spec_id}/apply-suggestions")
def handle_ai_suggestions(spec_id: int, accept: bool, db: Session = Depends(get_db)):
    spec = db.query(APISpecification).filter(APISpecification.id == spec_id).first()
    if not spec:
        raise HTTPException(status_code=404, detail="Specification not found.")
    
    if accept:
        spec.suggestions_applied = True
        spec.workflow_status = WorkflowStatus.PROTOTYPE_READY
        reason = "Success: Developer accepted AI fixes. Moving to Prototype mode."
    else:
        spec.suggestions_applied = False
        spec.workflow_status = WorkflowStatus.REJECTED
        reason = "Rejected: Developer declined required AI fixes for high-redundancy API."

    gov_report = db.query(GovernanceReport).filter(GovernanceReport.api_spec_id == spec_id).first()
    if gov_report:
        gov_report.final_decision = spec.workflow_status.value
        gov_report.reason = reason

    db.commit()
    return {"status": spec.workflow_status.value, "message": reason}

# 3. MANUAL ARCHITECTURAL REVIEW
@router.post("/{spec_id}/governance/review")
def manual_governance_review(spec_id: int, payload: ManualReviewPayload, db: Session = Depends(get_db)):
    spec = db.query(APISpecification).filter(APISpecification.id == spec_id).first()
    if not spec or spec.workflow_status != WorkflowStatus.PENDING_REVIEW:
        raise HTTPException(status_code=400, detail="Invalid specification or state.")

    gov_report = db.query(GovernanceReport).filter(GovernanceReport.api_spec_id == spec_id).first()

    if payload.decision == "APPROVE":
        spec.workflow_status = WorkflowStatus.PROTOTYPE_READY
    else:
        spec.workflow_status = WorkflowStatus.REJECTED

    if gov_report:
        gov_report.final_decision = spec.workflow_status.value
        gov_report.reason = f"Manual Review: {payload.notes}"
        gov_report.reviewed_by = "Lead Architect"

    db.commit()
    return {"status": spec.workflow_status.value}

# --- UPDATED CRUD ENDPOINTS ---

@router.get("/all_specs", response_model=List[APISpecificationRead])
def get_all_specs(db: Session = Depends(get_db)):
    # joinedload pulls the SemanticAnalysis data from the DB so it's not null
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