import shutil
import os
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.db.session import get_db
from app.services.governance_service import run_governance_pipeline
from app.models.specification import APISpecification
from app.models.governance_report import GovernanceReport
from app.models.schemas import WorkflowStatus, ManualReviewPayload

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

# 2. THE INTERACTIVE AI FIX LOOP (Developer Reviews/Applies Fixes)
@router.post("/{spec_id}/apply-suggestions")
def handle_ai_suggestions(spec_id: int, accept: bool, db: Session = Depends(get_db)):
    spec = db.query(APISpecification).filter(APISpecification.id == spec_id).first()
    if not spec:
        raise HTTPException(status_code=404, detail="Specification not found.")
    
    if accept:
        # Developer says YES [Matches 'Developer Fix' transition in State Machine]
        spec.suggestions_applied = True
        spec.workflow_status = WorkflowStatus.PROTOTYPE_READY
        reason = "Success: Developer accepted AI fixes. Moving to Prototype mode."
    else:
        # Developer says NO
        spec.suggestions_applied = False
        spec.workflow_status = WorkflowStatus.REJECTED
        reason = "Rejected: Developer declined required AI fixes for high-redundancy API."

    # Update Audit Trail
    gov_report = db.query(GovernanceReport).filter(GovernanceReport.api_spec_id == spec_id).first()
    if gov_report:
        gov_report.final_decision = spec.workflow_status.value
        gov_report.reason = reason

    db.commit()
    return {"status": spec.workflow_status.value, "message": reason}

# 3. MANUAL ARCHITECTURAL REVIEW (The Yellow Lane)
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