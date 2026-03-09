from sqlalchemy.orm import Session
from app.models.specification import APISpecification
from app.models.audit_results import StructuralReport, ViolationDetail
from app.models.schemas import WorkflowStatus, Severity
from app.core.linter import run_spectral_audit
from app.core.scoring import calculate_structural_score
# Import the new AI Service
from app.services.ai_service import AIService 
import os

def run_governance_pipeline(db: Session, title: str, version: str, content: str, user_id: int):
    # 1. Create initial Specification record
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
        # 2. Execution of Spectral Linter
        raw_violations = run_spectral_audit(temp_file_path)
        audit_results = calculate_structural_score(raw_violations)
        
        # 3. Persist Structural Report
        report = StructuralReport(
            score=audit_results["score"],
            isPassed=audit_results["is_passed"],
            total_errors=audit_results["total_errors"],
            total_warnings=audit_results["total_warnings"],
            api_spec_id=new_spec.id
        )
        db.add(report)
        db.commit()
        db.refresh(report)

        # 4. Persist individual violations
        for v in audit_results["violations"]:
            sev = Severity.ERROR if v.get("severity") == 0 else Severity.WARNING
            violation = ViolationDetail(
                rule_name=v.get("code"),
                severity=sev,
                message=v.get("message"),
                report_id=report.id
            )
            db.add(violation)

        # === NEW: AI SEMANTIC ENGINE GATE ===
        # As per your diagram: If Score >= 80%, move to AI Analysis Stage
        ai_report = None
        if report.isPassed: # isPassed is True if score >= 80
            new_spec.workflow_status = WorkflowStatus.VALIDATED
            db.commit() # Save the validated status before AI starts

            # Initialize and run AI Service
            ai_service = AIService()
            ai_report = ai_service.analyze_api_semantics(db, new_spec)

            # Update status based on AI Redundancy findings
            if ai_report.is_redundant:
                new_spec.workflow_status = WorkflowStatus.REJECTED # Overlap detected
            else:
                new_spec.workflow_status = WorkflowStatus.PROTOTYPE_READY # Pass to next layer
        else:
            new_spec.workflow_status = WorkflowStatus.REJECTED

        db.commit()

        return {
            "spec_id": new_spec.id, 
            "status": new_spec.workflow_status, 
            "structural_score": report.score,
            "ai_analysis": {
                "similarity": ai_report.similarity_score if ai_report else None,
                "is_redundant": ai_report.is_redundant if ai_report else False,
                "suggestions": ai_report.ai_suggested_fix if ai_report else None
            }
        }

    finally:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)