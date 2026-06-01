import shutil
import os
import difflib
from typing import List
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Body
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import text, or_
from fastapi.encoders import jsonable_encoder
from datetime import datetime
from app.db.session import get_db
from app.services.governance_service import run_governance_pipeline
from app.models.specification import APISpecification
from app.models.governance_report import GovernanceReport
from app.models.audit_results import StructuralReport, ViolationDetail
from app.models.schemas import WorkflowStatus, APISpecificationRead, RejectPayload, ApprovePayload, ContentUpdatePayload
from app.models.user import User
from app.models.notification import Notification
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
        is_admin = current_user.role == "ADMIN"
        pipeline_result = run_governance_pipeline(
            db=db,
            title=file.filename,
            version="1.0.0",
            content=content,
            user_id=current_user.id,
            is_admin=is_admin
        )

        spec_id = pipeline_result.get("spec_id")
        spec = db.query(APISpecification).filter(APISpecification.id == spec_id).first()

        if not spec:
            raise HTTPException(status_code=404, detail="Failed to retrieve specification.")

        # 🔄 VERSION DIFF: detect if a previous version of the same file exists
        version_diff = None
        previous_version_id = None
        previous_spec = db.query(APISpecification).filter(
            APISpecification.title == file.filename,
            APISpecification.id != spec_id
        ).order_by(APISpecification.created_at.desc()).first()
        if previous_spec:
            diff_lines = list(difflib.unified_diff(
                previous_spec.raw_content.splitlines(keepends=True),
                content.splitlines(keepends=True),
                fromfile=f"v{previous_spec.id}",
                tofile=f"v{spec_id}",
                lineterm=''
            ))
            version_diff = ''.join(diff_lines) if diff_lines else None
            previous_version_id = previous_spec.id

        # 🪄 STEP 2: MANDATORY AI REFACTORING (only when structural violations exist, not similarity rejections)
        ai_suggestions = pipeline_result.get("ai_analysis", {}).get("suggestions")
        violations = pipeline_result.get("violations", [])
        similarity = pipeline_result.get("ai_analysis", {}).get("similarity", 0)
        is_similarity_rejection = similarity >= 0.85

        if violations and ai_suggestions and "Architecture is sound" not in ai_suggestions and not is_similarity_rejection:
            try:
                print(f"🪄 MANDATORY AUTO-FIX: Refactoring {file.filename}...")
                fixed_yaml = llm_engine.apply_suggestion_to_yaml(spec.raw_content, ai_suggestions)
                
                if fixed_yaml and "openapi" in fixed_yaml.lower():
                    # Guard: reject AI fix if it creates duplicate operationIds (breaks WSO2)
                    op_ids = [l.split("operationId:")[-1].strip() for l in fixed_yaml.splitlines() if "operationId:" in l]
                    if len(op_ids) == len(set(op_ids)):
                        spec.raw_content = fixed_yaml
                        spec.suggestions_applied = True
                        db.commit()
                    else:
                        print(f"⚠️ AI fix produced duplicate operationIds — keeping original content")
            except Exception as fix_err:
                print(f"⚠️ AI rewrite skipped (engine error): {fix_err}")

        # 🚀 STEP 3: WSO2 SYNC (admin path only — normal user ≥80% is handled in governance_service)
        allowed_statuses = ["PROTOTYPE_READY", "AWAITING_FIX_CONFIRMATION", "PUBLISHED"]
        decision = pipeline_result.get("governance_decision")

        if (decision in allowed_statuses or spec.workflow_status == WorkflowStatus.PUBLISHED) and not spec.external_id:
            print(f"🚀 Gate Cleared! Pushing FIXED version to WSO2...")
            
            final_temp_path = f"final_fixed_{spec_id}.yaml"
            try:
                with open(final_temp_path, "w") as f:
                    f.write(spec.raw_content)

                wso2_id = import_api_from_yaml(final_temp_path)
                
                if wso2_id:
                    spec.external_id = wso2_id
                    spec.workflow_status = WorkflowStatus.PUBLISHED
                    print(f"🏆 WSO2 published: {wso2_id}")
                else:
                    spec.workflow_status = WorkflowStatus.REJECTED
                    print(f"❌ WSO2 import failed")
                
                db.commit()
            except Exception as wso2_err:
                print(f"❌ WSO2 sync error in specs.py: {wso2_err}")
                spec.workflow_status = WorkflowStatus.REJECTED
                db.commit()
            finally:
                if os.path.exists(final_temp_path):
                    os.remove(final_temp_path)
                    
        # 🔔 NOTIFICATIONS
        structural_score = pipeline_result.get("structural_score", 0)
        if not is_admin:
            admins = db.query(User).filter(User.role == "ADMIN").all()
            if spec.workflow_status == WorkflowStatus.PENDING_APPROVAL:
                for admin in admins:
                    db.add(Notification(
                        user_id=admin.id,
                        message=f"{current_user.username} submitted '{file.filename}' (score {round(structural_score, 1)}%) — pending your review and approval.",
                        spec_id=spec.id,
                        notification_type="PENDING_APPROVAL"
                    ))
            elif spec.workflow_status == WorkflowStatus.PUBLISHED:
                for admin in admins:
                    db.add(Notification(
                        user_id=admin.id,
                        message=f"'{file.filename}' submitted by {current_user.username} was auto-published. Structural score: {round(structural_score, 1)}%.",
                        spec_id=spec.id,
                        notification_type="AUTO_PUBLISHED"
                    ))
            elif spec.workflow_status == WorkflowStatus.REJECTED:
                similarity = pipeline_result.get("ai_analysis", {}).get("similarity", 0)
                if similarity >= 0.85:
                    reject_msg = f"Your specification '{file.filename}' was rejected — similarity score {round(similarity * 100, 1)}% exceeds the 85% threshold. A functionally identical API already exists in the catalog."
                else:
                    reject_msg = f"Your specification '{file.filename}' was automatically rejected. Structural score {round(structural_score, 1)}% did not meet the 50% minimum threshold."
                db.add(Notification(
                    user_id=current_user.id,
                    message=reject_msg,
                    spec_id=spec.id,
                    notification_type="REJECTION"
                ))
            db.commit()

        return {
            "status": "SUCCESS" if spec.workflow_status == WorkflowStatus.PUBLISHED else "PARTIAL_SUCCESS",
            "spec_id": spec.id,
            "final_status": spec.workflow_status.value,
            "wso2_id": spec.external_id,
            "version_diff": version_diff,
            "previous_version_id": previous_version_id,
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
    query = db.query(APISpecification).options(joinedload(APISpecification.semantic_analysis))
    if current_user.role != "ADMIN":
        query = query.filter(
            or_(
                APISpecification.user_id == current_user.id,
                APISpecification.workflow_status == WorkflowStatus.PUBLISHED
            )
        )
    return query.all() or []

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
        "external_id": spec.external_id,
        "rejection_reason": spec.rejection_reason,
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
    
    pending = db.query(APISpecification).filter(APISpecification.workflow_status == WorkflowStatus.PENDING_APPROVAL).count()

    return {
        "total_apis": total,
        "published_count": published,
        "rejected_count": rejected,
        "pending_count": pending,
        "average_health_score": round(float(avg_score), 2)
    }

# --- 4. ADMIN APPROVE / REJECT ---
@router.post("/{spec_id}/approve")
def approve_spec(spec_id: int, payload: ApprovePayload = Body(default=ApprovePayload()), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admins can approve specs.")
    spec = db.query(APISpecification).filter(APISpecification.id == spec_id).first()
    if not spec:
        raise HTTPException(status_code=404, detail="Spec not found.")
    if spec.workflow_status != WorkflowStatus.PENDING_APPROVAL:
        raise HTTPException(status_code=400, detail="Spec is not pending approval.")

    final_temp_path = f"approve_temp_{spec_id}.yaml"
    wso2_id = None
    try:
        with open(final_temp_path, "w") as f:
            f.write(spec.raw_content)
        wso2_id = import_api_from_yaml(final_temp_path)
    except Exception as e:
        print(f"WSO2 approval error: {e}")
    finally:
        if os.path.exists(final_temp_path):
            os.remove(final_temp_path)

    spec.workflow_status = WorkflowStatus.PUBLISHED
    if wso2_id:
        spec.external_id = wso2_id
    if payload.note:
        spec.rejection_reason = payload.note
    db.commit()

    note_text = f" Note: {payload.note}" if payload.note else ""
    db.add(Notification(
        user_id=spec.user_id,
        message=f"Your API specification '{spec.title}' has been reviewed, approved, and published by {current_user.username}.{note_text}",
        spec_id=spec_id,
        notification_type="APPROVAL"
    ))
    db.commit()
    return {"status": "APPROVED", "spec_id": spec_id, "wso2_id": wso2_id}


@router.post("/{spec_id}/reject")
def reject_spec(spec_id: int, payload: RejectPayload, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admins can reject specs.")
    spec = db.query(APISpecification).filter(APISpecification.id == spec_id).first()
    if not spec:
        raise HTTPException(status_code=404, detail="Spec not found.")

    spec.workflow_status = WorkflowStatus.REJECTED
    spec.rejection_reason = payload.reason
    db.commit()

    db.add(Notification(
        user_id=spec.user_id,
        message=f"Your API specification '{spec.title}' was rejected after review. Reason: {payload.reason}",
        spec_id=spec_id,
        notification_type="REJECTION"
    ))
    db.commit()
    return {"status": "REJECTED", "spec_id": spec_id, "reason": payload.reason}


# --- 4b. PATCH YAML CONTENT ---
@router.patch("/{spec_id}/content")
def update_spec_content(spec_id: int, payload: ContentUpdatePayload, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    spec = db.query(APISpecification).filter(APISpecification.id == spec_id).first()
    if not spec:
        raise HTTPException(status_code=404, detail="Spec not found.")
    if spec.user_id != current_user.id and current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized to edit this spec.")
    spec.raw_content = payload.raw_content
    db.commit()
    return {"status": "UPDATED", "spec_id": spec_id}


# --- NOTIFICATIONS ---
@router.get("/notifications/list")
def get_notifications(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    notifs = db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(Notification.created_at.desc()).limit(30).all()
    return [
        {
            "id": n.id,
            "message": n.message,
            "is_read": n.is_read,
            "notification_type": n.notification_type,
            "spec_id": n.spec_id,
            "created_at": n.created_at.isoformat() if n.created_at else None,
        }
        for n in notifs
    ]


@router.patch("/notifications/{notif_id}/read")
def mark_notification_read(notif_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    notif = db.query(Notification).filter(
        Notification.id == notif_id,
        Notification.user_id == current_user.id
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found.")
    notif.is_read = True
    db.commit()
    return {"status": "READ"}


# --- 5. DELETE BY ID ---
@router.delete("/{spec_id}")
def delete_spec_by_id(spec_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admins can delete specifications.")
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