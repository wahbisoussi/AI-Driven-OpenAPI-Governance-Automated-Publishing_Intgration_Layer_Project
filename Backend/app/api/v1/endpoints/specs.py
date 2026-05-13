import shutil
import os
from typing import List
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import text
from fastapi.encoders import jsonable_encoder
from datetime import datetime
from app.db.session import get_db
from app.services.governance_service import run_governance_pipeline
from app.models.specification import APISpecification
from app.models.governance_report import GovernanceReport
from app.models.audit_results import StructuralReport, ViolationDetail
from app.models.schemas import WorkflowStatus, APISpecificationRead
from app.models.user import User
from app.ai.llm_engine import LLMEngine
from app.services.publisher_service import import_api_from_yaml, publish_api_full_lifecycle
from app.core.deps import get_current_user

router = APIRouter()
llm_engine = LLMEngine() 

# --- 1. UPLOAD & AUTOMATED GOVERNANCE PIPELINE ---
@router.post("/upload")
async def upload_spec(file: UploadFile = File(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    temp_path = f"temp_{file.filename}"
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    try:
        with open(temp_path, "r") as f:
            content = f.read()
            
        # 🟢 STEP 1: Run Governance Pipeline
        pipeline_result = run_governance_pipeline(
            db=db,
            title=file.filename,
            version="1.0.0",
            content=content,
            user_id=current_user.id
        )

        spec_id = pipeline_result.get("spec_id")
        spec = db.query(APISpecification).filter(APISpecification.id == spec_id).first()

        if not spec:
            raise HTTPException(status_code=404, detail="Failed to retrieve specification.")

        # 🪄 STEP 2: MANDATORY AI REFACTORING
        ai_suggestions = pipeline_result.get("ai_analysis", {}).get("suggestions")
        
        if ai_suggestions and "Architecture is sound" not in ai_suggestions:
            print(f"🪄 MANDATORY AUTO-FIX: Refactoring {file.filename}...")
            fixed_yaml = llm_engine.apply_suggestion_to_yaml(spec.raw_content, ai_suggestions)
            
            if fixed_yaml and "openapi" in fixed_yaml.lower():
                spec.raw_content = fixed_yaml
                spec.suggestions_applied = True
                db.commit() 

        # 🚀 STEP 3: THE ONLY WSO2 SYNC
        allowed_statuses = ["PROTOTYPE_READY", "AWAITING_FIX_CONFIRMATION", "PUBLISHED"]
        decision = pipeline_result.get("governance_decision")

        if decision in allowed_statuses or spec.workflow_status == WorkflowStatus.PUBLISHED:
            print(f"🚀 Gate Cleared! Pushing FIXED version to WSO2...")
            
            final_temp_path = f"final_fixed_{spec_id}.yaml"
            with open(final_temp_path, "w") as f:
                f.write(spec.raw_content)

            try:
                # import_api_from_yaml already runs full lifecycle internally
                wso2_id = import_api_from_yaml(final_temp_path)
                
                if wso2_id:
                    spec.external_id = wso2_id
                    spec.workflow_status = WorkflowStatus.PUBLISHED
                    print(f"🏆 WSO2 published: {wso2_id}")
                else:
                    spec.workflow_status = WorkflowStatus.REJECTED
                    print(f"❌ WSO2 import failed")
                
                db.commit()
            finally:
                if os.path.exists(final_temp_path):
                    os.remove(final_temp_path)
                    
        return {
            "status": "SUCCESS" if spec.workflow_status == WorkflowStatus.PUBLISHED else "PARTIAL_SUCCESS",
            "spec_id": spec.id,
            "final_status": spec.workflow_status.value,
            "wso2_id": spec.external_id
        }

    except Exception as e:
        db.rollback()
        print(f"❌ PIPELINE FAILURE: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

# --- 2. RETRIEVE SPECS ---
@router.get("/all_specs", response_model=List[APISpecificationRead])
def get_all_specs(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    specs = db.query(APISpecification).options(
        joinedload(APISpecification.semantic_analysis)
    ).all()
    return specs if specs else []

@router.get("/{spec_id}/report")
def get_spec_report(spec_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    structural = db.query(StructuralReport).filter(
        StructuralReport.api_spec_id == spec_id
    ).options(joinedload(StructuralReport.violations)).first()

    governance = db.query(GovernanceReport).filter(
        GovernanceReport.api_spec_id == spec_id
    ).first()

    return {
        "structural": {
            "score": structural.score,
            "isPassed": structural.isPassed,
            "total_errors": structural.total_errors,
            "total_warnings": structural.total_warnings,
            "violations": [
                {
                    "id": v.id,
                    "rule_name": v.rule_name,
                    "severity": v.severity.value,
                    "message": v.message,
                    "line_number": v.line_number,
                }
                for v in structural.violations
            ],
        } if structural else None,
        "governance": {
            "final_decision": governance.final_decision,
            "reason": governance.reason,
            "structural_score": governance.structural_score,
            "ai_similarity_score": governance.ai_similarity_score,
            "timestamp": governance.timestamp.isoformat() if governance.timestamp else None,
        } if governance else None,
    }


@router.get("/{spec_id}")
def get_spec_by_id(spec_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    spec = db.query(APISpecification).filter(APISpecification.id == spec_id).first()
    if not spec:
        raise HTTPException(status_code=404, detail="API Specification not found.")

    spec_data = {
        "id": spec.id,
        "title": spec.title,
        "version": spec.version,
        "raw_content": spec.raw_content,
        "workflow_status": spec.workflow_status.value if spec.workflow_status else None,
        "created_at": spec.created_at.isoformat() if spec.created_at else None,
        "suggestions_applied": spec.suggestions_applied,
        "user_id": spec.user_id,
        "external_id": spec.external_id
    }

    if spec.semantic_analysis:
        spec_data["semantic_analysis"] = {
            "is_redundant": spec.semantic_analysis.is_redundant,
            "similarity_score": spec.semantic_analysis.similarity_score,
            "ai_suggested_fix": spec.semantic_analysis.ai_suggested_fix
        }

    return jsonable_encoder(spec_data)

# --- 3. DASHBOARD STATS ---
@router.get("/dashboard/stats")
def get_governance_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    total = db.query(APISpecification).count()
    published = db.query(APISpecification).filter(APISpecification.workflow_status == WorkflowStatus.PUBLISHED).count()
    rejected = db.query(APISpecification).filter(APISpecification.workflow_status == WorkflowStatus.REJECTED).count()
    
    avg_score = db.execute(text("SELECT AVG(score) FROM structural_reports")).scalar() or 0
    
    return {
        "total_apis": total,
        "published_count": published,
        "rejected_count": rejected,
        "average_health_score": round(float(avg_score), 2)
    }

# --- 4. DELETE BY ID ---
@router.delete("/{spec_id}")
def delete_spec_by_id(spec_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    spec = db.query(APISpecification).filter(APISpecification.id == spec_id).first()
    if not spec:
        raise HTTPException(status_code=404, detail="API Specification not found.")
    try:
        db.execute(text(f"DELETE FROM violation_details WHERE report_id IN (SELECT id FROM structural_reports WHERE api_spec_id = {spec_id})"))
        db.execute(text(f"DELETE FROM structural_reports WHERE api_spec_id = {spec_id}"))
        db.execute(text(f"DELETE FROM governance_reports WHERE api_spec_id = {spec_id}"))
        db.execute(text(f"DELETE FROM semantic_analysis WHERE specification_id = {spec_id}"))
        db.delete(spec)
        db.commit()
        return {"detail": f"Spec {spec_id} deleted successfully.", "status": "SUCCESS"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# --- 5. SYSTEM CLEANUP ---
@router.delete("/all/clear-database")
def delete_all_specs(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        db.execute(text("DELETE FROM violation_details"))
        db.execute(text("DELETE FROM structural_reports"))
        db.execute(text("DELETE FROM governance_reports"))
        db.execute(text("DELETE FROM semantic_analysis"))  
        db.query(APISpecification).delete()
        db.commit()
        return {"detail": "System Purged.", "status": "SUCCESS"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))