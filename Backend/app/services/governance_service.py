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

# Threshold for triggering the AI
MIN_SCORE_FOR_AI = 10

def run_governance_pipeline(db: Session, title: str, version: str, content: str, user_id: int):
    ai_service = AIService()

    # --- PHASE 0: DUPLICATE DETECTION ---
    text_to_embed = ai_service.vector_store._extract_searchable_text(content)
    current_embedding = ai_service.vector_store.get_embedding(text_to_embed)
    match_data = ai_service.vector_store.find_most_similar(db, -1, current_embedding)
    
    if match_data:
        _, similarity_score = match_data
        if similarity_score > 0.98:
            print(f"🚫 BLOCKING: Exact duplicate detected ({round(similarity_score*100, 2)}%)")
            return {
                "status": "REJECTED",
                "governance_decision": "REJECTED",
                "reason": "Duplicate API detected in catalog.",
                "ai_analysis": {"similarity": float(similarity_score), "requires_action": True}
            }

    # --- PHASE 1: INITIAL RECORDING ---
    new_spec = APISpecification(
        title=title, version=version, raw_content=content,
        user_id=user_id, workflow_status=WorkflowStatus.IMPORTED
    )
    db.add(new_spec)
    db.flush() 

    temp_file_path = f"temp_spec_{new_spec.id}.yaml"
    with open(temp_file_path, "w") as f:
        f.write(content)

    try:
        # --- PHASE 2: STRUCTURAL VALIDATION (Spectral) ---
        raw_violations = run_spectral_audit(temp_file_path)
        audit_results = calculate_structural_score(raw_violations)

        # --- NEW: DEBUG LOGS FOR YOUR PRESENTATION ---
        print("\n--- 🚨 SPECTRAL AUDIT DETAILS 🚨 ---")
        print(f"Final Score: {audit_results['score']}%")
        for v in audit_results["violations"]:
            sev_label = "ERROR" if v.get("severity") == 0 else "WARNING"
            print(f"[{sev_label}] {v.get('code')}: {v.get('message')}")
            print("------------------------------------\n")
        
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
            db.add(ViolationDetail(
                rule_name=v.get("code"), severity=sev,
                message=v.get("message"), report_id=report.id
            ))

        # --- PHASE 3: SEMANTIC ANALYSIS (AI Engine) ---
        ai_report = None
        similarity_score = 0.0
        ai_suggestions = "AI Skipped (Structural score below threshold)."

        if report.score >= MIN_SCORE_FOR_AI: 
            ai_report = ai_service.analyze_api_semantics(db, new_spec)
            if ai_report:
                similarity_score = float(ai_report.similarity_score)
                ai_suggestions = ai_report.ai_suggested_fix if ai_report.ai_suggested_fix else "Architecture is sound. No automated refactoring suggested."

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

        # --- PHASE 5: WSO2 ORCHESTRATION (DISABLED) ---
        # wso2_api_id = None
        # if gate_decision["status"] == "PROTOTYPE_READY":
        #     print(f"🚀 Governance Passed! (WSO2 logic bypassed for testing)")

        db.commit()

        return {
            "spec_id": new_spec.id, 
            "status": new_spec.workflow_status.value, 
            "governance_decision": gate_decision["status"],
            "reason": gate_decision["reason"],
            "ai_analysis": {
                "similarity": similarity_score,
                "suggestions": ai_suggestions,
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