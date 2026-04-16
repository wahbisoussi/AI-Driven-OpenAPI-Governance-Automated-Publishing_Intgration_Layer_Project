import shutil
import os
from typing import List
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import text

from app.db.session import get_db
from app.services.governance_service import run_governance_pipeline
from app.services.wso2_client import WSO2Client  # Import WSO2 Client
from app.models.specification import APISpecification
from app.models.governance_report import GovernanceReport
from app.models.schemas import WorkflowStatus, ManualReviewPayload, APISpecificationRead
from app.ai.llm_engine import LLMEngine 

router = APIRouter()
llm_engine = LLMEngine() 

# --- 1. UPLOAD & RUN PIPELINE ---
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

# --- 2. APPLY AI SUGGESTIONS & SYNC TO WSO2 ---
@router.post("/{spec_id}/apply-suggestions")
def handle_ai_suggestions(spec_id: int, accept: bool, db: Session = Depends(get_db)):
    spec = db.query(APISpecification).options(
        joinedload(APISpecification.semantic_analysis)
    ).filter(APISpecification.id == spec_id).first()
    
    if not spec:
        raise HTTPException(status_code=404, detail="Specification not found.")
    
    old_yaml = spec.raw_content 
    reason = "No changes made."

    if accept:
        suggestion_text = getattr(spec.semantic_analysis, "ai_suggested_fix", "")
        
        if suggestion_text:
            print(f"🪄 Applying AI Refactoring for Spec ID: {spec_id}")
            fixed_yaml = llm_engine.apply_suggestion_to_yaml(spec.raw_content, suggestion_text)
            
            if fixed_yaml and "openapi" in fixed_yaml.lower():
                # Update Local DB
                spec.raw_content = fixed_yaml 
                spec.suggestions_applied = True
                spec.workflow_status = WorkflowStatus.PROTOTYPE_READY
                
                # --- SYNC TO WSO2 GATEWAY ---
                try:
                    wso2 = WSO2Client()
                    temp_fix_path = f"temp_fix_{spec.id}.yaml"
                    with open(temp_fix_path, "w") as f:
                        f.write(fixed_yaml)
                    
                    # Run WSO2 Lifecycle for the FIXED version
                    wso2_id = wso2.import_rest_api(temp_fix_path)
                    if wso2_id:
                        spec.external_id = wso2_id
                        db.flush()
                        if wso2.deploy_to_prototype(wso2_id):
                            if wso2.run_functional_checks(wso2_id):
                                if wso2.publish_api(wso2_id):
                                    spec.workflow_status = WorkflowStatus.PUBLISHED
                    
                    if os.path.exists(temp_fix_path):
                        os.remove(temp_fix_path)
                    reason = "Success: YAML refactored by AI and Published to WSO2."
                except Exception as e:
                    reason = f"AI Refactor success, but WSO2 Sync failed: {str(e)}"
            else:
                reason = "AI Refactor failed: Model returned invalid YAML."
    else:
        spec.suggestions_applied = False
        spec.workflow_status = WorkflowStatus.REJECTED
        reason = "Rejected: Developer declined AI optimizations."

    db.commit()
    
    return {
        "status": spec.workflow_status.value, 
        "message": reason,
        "updated_code": spec.raw_content 
    }

# --- 3. DASHBOARD STATS ---
@router.get("/dashboard/stats")
def get_governance_stats(db: Session = Depends(get_db)):
    total = db.query(APISpecification).count()
    published = db.query(APISpecification).filter(APISpecification.workflow_status == WorkflowStatus.PUBLISHED).count()
    rejected = db.query(APISpecification).filter(APISpecification.workflow_status == WorkflowStatus.REJECTED).count()
    
    # Calculate average health score from structural reports
    avg_score = db.execute(text("SELECT AVG(score) FROM structural_reports")).scalar() or 0
    
    return {
        "total_apis": total,
        "published_count": published,
        "rejected_count": rejected,
        "average_health_score": round(float(avg_score), 2)
    }

# --- 4. RETRIEVE SPECS ---
@router.get("/all_specs", response_model=List[APISpecificationRead])
def get_all_specs(db: Session = Depends(get_db)):
    specs = db.query(APISpecification).options(
        joinedload(APISpecification.semantic_analysis)
    ).all()
    return specs if specs else []

@router.get("/{spec_id}")
def get_spec_by_id(spec_id: int, db: Session = Depends(get_db)):
    spec = db.query(APISpecification).options(
        joinedload(APISpecification.semantic_analysis),
        joinedload(APISpecification.structural_report)
    ).filter(APISpecification.id == spec_id).first()
    
    if not spec:
        raise HTTPException(status_code=404, detail="API Specification not found.")
    return spec

# --- 5. DELETE METHODS (CRUD) ---
@router.delete("/{spec_id}")
def delete_spec(spec_id: int, db: Session = Depends(get_db)):
    spec = db.query(APISpecification).filter(APISpecification.id == spec_id).first()
    if not spec:
        raise HTTPException(status_code=404, detail="API Specification not found.")
    
    try:
        # Cascading deletes for audit results
        db.execute(text("DELETE FROM violation_details WHERE report_id IN (SELECT id FROM structural_reports WHERE api_spec_id = :id)"), {"id": spec_id})
        db.execute(text("DELETE FROM structural_reports WHERE api_spec_id = :id"), {"id": spec_id})
        db.execute(text("DELETE FROM semantic_analysis WHERE specification_id = :id"), {"id": spec_id})
        db.execute(text("DELETE FROM governance_reports WHERE api_spec_id = :id"), {"id": spec_id})
        
        db.delete(spec)
        db.commit()
        return {"detail": f"Spec {spec_id} deleted successfully."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")

@router.delete("/all/clear-database")
def delete_all_specs(db: Session = Depends(get_db)):
    try:
        db.execute(text("DELETE FROM violation_details"))
        db.execute(text("DELETE FROM structural_reports"))
        db.execute(text("DELETE FROM governance_reports"))
        db.execute(text("DELETE FROM semantic_analysis"))
        num_deleted = db.query(APISpecification).delete(synchronize_session=False)
        db.commit()
        return {"detail": f"System Purged. Deleted {num_deleted} specs.", "status": "SUCCESS"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))