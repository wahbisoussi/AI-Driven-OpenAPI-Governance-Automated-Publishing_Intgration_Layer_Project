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

def run_governance_pipeline(db: Session, title: str, version: str, content: str, user_id: int):
    # PHASE 1: INITIAL IMPORT [cite: 14]
    new_spec = APISpecification(
        title=title,
        version=version,
        raw_content=content,
        user_id=user_id,
        workflow_status=WorkflowStatus.IMPORTED
    )
    db.add(new_spec)
    db.commit()
    db.refresh(new_spec)

    temp_file_path = f"temp_spec_{new_spec.id}.yaml"
    with open(temp_file_path, "w") as f:
        f.write(content)

    try:
        # PHASE 2: STRUCTURAL AUDIT (Spectral) [cite: 15, 31]
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
        db.commit()

        for v in audit_results["violations"]:
            sev = Severity.ERROR if v.get("severity") == 0 else Severity.WARNING
            violation = ViolationDetail(
                rule_name=v.get("code"),
                severity=sev,
                message=v.get("message"),
                report_id=report.id
            )
            db.add(violation)

        # PHASE 3: AI SEMANTIC ENGINE [cite: 16, 34]
        ai_report = None
        similarity_score = 0.0

        if report.isPassed: 
            new_spec.workflow_status = WorkflowStatus.VALIDATED
            db.commit()
            
            ai_service = AIService()
            ai_report = ai_service.analyze_api_semantics(db, new_spec)
            similarity_score = ai_report.similarity_score if ai_report else 0.0

        # PHASE 4: GOVERNANCE GATE (Automated Decision) [cite: 17, 33]
        # Uses 'suggestions_applied' to check if developer already fixed issues
        gate_decision = evaluate_api_compliance(
            structural_score=report.score,
            ai_similarity=similarity_score,
            suggestions_accepted=new_spec.suggestions_applied 
        )

        # Update Final Status & Audit Trail [cite: 24]
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
                "suggestions": ai_report.ai_suggested_fix if ai_report else None,
                "requires_action": gate_decision["status"] == "AWAITING_FIX_CONFIRMATION"
            }
        }

    finally:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)