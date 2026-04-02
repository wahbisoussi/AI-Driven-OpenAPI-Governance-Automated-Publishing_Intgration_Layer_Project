import os
from sqlalchemy.orm import Session
from app.models.specification import APISpecification
from app.models.audit_results import StructuralReport, ViolationDetail
from app.models.governance_report import GovernanceReport
from app.models.schemas import WorkflowStatus, Severity
from app.core.linter import run_spectral_audit
from app.core.scoring import calculate_structural_score
from app.services.ai_service import AIService 
from app.services.governance_gate import evaluate_api_compliance

MIN_SCORE_FOR_AI = 40 

def run_governance_pipeline(db: Session, title: str, version: str, content: str, user_id: int):
    """
    Main orchestration logic. 
    Now includes a 'Gatekeeper' check to block duplicates before saving.
    """
    ai_service = AIService()

    # --- PHASE 0: THE GATEKEEPER (PRE-CHECK) ---
    # We check similarity BEFORE creating any DB records
    text_to_embed = ai_service.vector_store._extract_searchable_text(content)
    current_embedding = ai_service.vector_store.get_embedding(text_to_embed)
    
    # We pass -1 because the spec doesn't have an ID yet
    match_data = ai_service.vector_store.find_most_similar(db, -1, current_embedding)
    
    if match_data:
        existing_record, similarity_score = match_data
        if similarity_score > 0.98:
            print(f"🚫 BLOCKING UPLOAD: Exact duplicate detected ({round(similarity_score*100, 2)}%)")
            return {
                "status": "REJECTED",
                "governance_decision": "REJECTED",
                "reason": "Duplicate API: An identical specification already exists in the catalog.",
                "ai_analysis": {
                    "similarity": float(similarity_score),
                    "suggestions": "None - Duplicate blocked.",
                    "requires_action": True
                }
            }

    # --- PHASE 1: INITIAL IMPORT (Proceeding since it's unique) ---
    new_spec = APISpecification(
        title=title,
        version=version,
        raw_content=content,
        user_id=user_id,
        workflow_status=WorkflowStatus.IMPORTED
    )
    db.add(new_spec)
    db.flush() # Assigns ID without full commit

    temp_file_path = f"temp_spec_{new_spec.id}.yaml"
    with open(temp_file_path, "w") as f:
        f.write(content)

    try:
        # --- PHASE 2: STRUCTURAL AUDIT ---
        raw_violations = run_spectral_audit(temp_file_path)
        audit_results = calculate_structural_score(raw_violations)
        
        report = StructuralReport(
            score=audit_results["score"],
            isPassed=audit_results["is_passed"],
            total_errors=audit_results["total_errors"],
            total_warnings=audit_results["total_warnings"],
            api_spec_id=new_spec.id
        )
        db.add(report)
        db.flush()

        for v in audit_results["violations"]:
            sev = Severity.ERROR if v.get("severity") == 0 else Severity.WARNING
            violation = ViolationDetail(
                rule_name=v.get("code"),
                severity=sev,
                message=v.get("message"),
                report_id=report.id
            )
            db.add(violation)

        # --- PHASE 3: AI SEMANTIC ENGINE ---
        ai_report = None
        similarity_score = 0.0

        if report.score >= MIN_SCORE_FOR_AI: 
            print(f"🧠 Score {report.score}% meets threshold. Running AI for Spec {new_spec.id}...")
            # We pass the full object now because it exists in the DB (flushed)
            ai_report = ai_service.analyze_api_semantics(db, new_spec)
            if ai_report:
                similarity_score = float(ai_report.similarity_score)
        else:
            print(f"⚠️ Score too low. AI Phase skipped.")

        # --- PHASE 4: GOVERNANCE GATE ---
        gate_decision = evaluate_api_compliance(
            structural_score=report.score,
            ai_similarity=similarity_score,
            suggestions_accepted=new_spec.suggestions_applied 
        )

        new_spec.workflow_status = WorkflowStatus(gate_decision["status"])
        
        gov_report = GovernanceReport(
            api_spec_id=new_spec.id,
            structural_score=report.score,
            ai_similarity_score=similarity_score,
            final_decision=gate_decision["status"],
            reason=gate_decision["reason"]
        )
        db.add(gov_report)
        db.commit()

        return {
            "spec_id": new_spec.id, 
            "status": new_spec.workflow_status.value, 
            "governance_decision": gate_decision["status"],
            "reason": gate_decision["reason"],
            "ai_analysis": {
                "similarity": similarity_score,
                "suggestions": ai_report.ai_suggested_fix if ai_report else "AI Skipped.",
                "requires_action": gate_decision["status"] in ["AWAITING_FIX_CONFIRMATION", "REJECTED"]
            }
        }

    except Exception as e:
        db.rollback()
        print(f"❌ PIPELINE ERROR: {str(e)}")
        raise e
    finally:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)