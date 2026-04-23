import shutil
import os
from typing import List
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import text
from fastapi.encoders import jsonable_encoder

from app.db.session import get_db
from app.services.governance_service import run_governance_pipeline
from app.services.publisher_service import import_api_from_yaml
from app.models.specification import APISpecification
from app.models.governance_report import GovernanceReport
from app.models.schemas import WorkflowStatus, APISpecificationRead
from app.ai.llm_engine import LLMEngine 

router = APIRouter()
llm_engine = LLMEngine() 

# --- 1. UPLOAD & AUTOMATED GOVERNANCE PIPELINE ---
@router.post("/upload")
async def upload_spec(file: UploadFile = File(...), db: Session = Depends(get_db)):
    temp_path = f"temp_{file.filename}"
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    try:
        with open(temp_path, "r") as f:
            content = f.read()
            
        # 🟢 STEP 1: Run Governance Pipeline (Spectral + AI Semantic)
        pipeline_result = run_governance_pipeline(
            db=db, 
            title=file.filename, 
            version="2026-04-22", 
            content=content, 
            user_id=1
        )

        spec_id = pipeline_result.get("spec_id")
        spec = db.query(APISpecification).filter(APISpecification.id == spec_id).first()

        if not spec:
            raise Exception("Failed to retrieve specification from database.")

        # 🪄 STEP 2: MANDATORY AI REFACTORING
        ai_suggestions = pipeline_result.get("ai_analysis", {}).get("suggestions")
        
        if ai_suggestions and "Architecture is sound" not in ai_suggestions:
            print(f"🪄 MANDATORY AUTO-FIX: Refactoring {file.filename}...")
            fixed_yaml = llm_engine.apply_suggestion_to_yaml(spec.raw_content, ai_suggestions)
            
            if fixed_yaml and "openapi" in fixed_yaml.lower():
                spec.raw_content = fixed_yaml
                spec.suggestions_applied = True
                db.flush() # Ensure the refactored YAML is saved before WSO2 sees it

        # 🚀 STEP 3: AUTO-SYNC TO WSO2
        # Gate check: only proceed if Green (Ready) or Yellow (Auto-fixed)
        #allowed_statuses = ["PROTOTYPE_READY", "AWAITING_FIX_CONFIRMATION"]
        #decision = pipeline_result.get("governance_decision")

        #if decision in allowed_statuses:
        #    print(f"🚀 Gate Cleared ({decision})! Pushing to WSO2...")
            
        #    # Save the final (fixed) version to a temporary file for WSO2 upload
        #    final_temp_path = f"final_{spec_id}_{file.filename}"
        #    with open(final_temp_path, "w") as f:
        #        f.write(spec.raw_content)
            
        #    try:
        #        wso2_id = import_api_from_yaml(final_temp_path)
        #        if wso2_id:
        #            spec.external_id = wso2_id
         #           spec.workflow_status = WorkflowStatus.PUBLISHED
        #            db.commit()
         #   finally:
        #        if os.path.exists(final_temp_path):
        #            os.remove(final_temp_path)
        #
         
        # 🚀 STEP 3: AUTO-SYNC TO WSO2
        allowed_statuses = ["PROTOTYPE_READY", "AWAITING_FIX_CONFIRMATION"]
        decision = pipeline_result.get("governance_decision")

        if decision in allowed_statuses:
            print(f"🚀 Gate Cleared ({decision})! Pushing to WSO2...")
            
            # Use the specification title but replace spaces with underscores for WSO2
            final_temp_name = spec.title.replace(" ", "_").replace(".yaml", "")
            final_temp_path = f"final_fixed_{final_temp_name}_{spec_id}.yaml"
            
            with open(final_temp_path, "w") as f:
                f.write(spec.raw_content)

            try:
                # THIS IS THE PART YOU WERE MISSING:
                wso2_id = import_api_from_yaml(final_temp_path)
                if wso2_id:
                    spec.external_id = wso2_id
                    spec.workflow_status = WorkflowStatus.PUBLISHED
                    db.commit()
            except Exception as wso2_err:
                print(f"⚠️ WSO2 Sync failed: {str(wso2_err)}")
            finally:
                # Clean up the file after pushing
                if os.path.exists(final_temp_path):
                    os.remove(final_temp_path)

                    
        # 🏁 STEP 4: Return Final result to Frontend
        return {
            "status": "SUCCESS" if spec.workflow_status == WorkflowStatus.PUBLISHED else "GOVERNANCE_PASSED_GATEWAY_FAILED",
            "pipeline_summary": pipeline_result,
            "final_status": spec.workflow_status.value if spec.workflow_status else "REJECTED",
            "ai_fixed": spec.suggestions_applied,
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
def get_all_specs(db: Session = Depends(get_db)):
    specs = db.query(APISpecification).options(
        joinedload(APISpecification.semantic_analysis)
    ).all()
    return specs if specs else []

@router.get("/{spec_id}")
def get_spec_by_id(spec_id: int, db: Session = Depends(get_db)):
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
def get_governance_stats(db: Session = Depends(get_db)):
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

# --- 4. SYSTEM CLEANUP ---
@router.delete("/all/clear-database")
def delete_all_specs(db: Session = Depends(get_db)):
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