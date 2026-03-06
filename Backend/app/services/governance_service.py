from sqlalchemy.orm import Session
from app.models.specification import APISpecification
from app.models.audit_results import StructuralReport, ViolationDetail
from app.models.schemas import WorkflowStatus, Severity
from app.core.linter import run_spectral_audit
from app.core.scoring import calculate_structural_score
import os

def run_governance_pipeline(db: Session, title: str, version: str, content: str, user_id: int):
    """
    Orchestrates the governance pipeline:
    1. Persists the raw spec.
    2. Runs Spectral Linter.
    3. Calculates Score using your logic.
    4. Persists the Report and all Violation details.
    5. Transitions the status in the database.
    """
    
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

    # 2. Setup temp file for the Linter
    temp_file_path = f"temp_spec_{new_spec.id}.yaml"
    with open(temp_file_path, "w") as f:
        f.write(content)

    try:
        # 3. Execution (The "Lint" arrow in your sequence diagram)
        raw_violations = run_spectral_audit(temp_file_path)
        
        # 4. Scoring (Uses your existing function)
        audit_results = calculate_structural_score(raw_violations)
        
        # 5. Persist Report
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

        # 6. Persist individual violations (The "Persistence" arrow)
        for v in audit_results["violations"]:
            # Map Spectral severity (0=error, 1=warning)
            sev = Severity.ERROR if v.get("severity") == 0 else Severity.WARNING
            
            violation = ViolationDetail(
                rule_name=v.get("code"),
                severity=sev,
                message=v.get("message"),
                report_id=report.id
            )
            db.add(violation)

        # 7. Finalize State Machine Transition
        new_spec.workflow_status = WorkflowStatus.VALIDATED if report.isPassed else WorkflowStatus.REJECTED
        db.commit()

        return {
            "spec_id": new_spec.id, 
            "status": new_spec.workflow_status, 
            "score": report.score
        }

    finally:
        # Clean up
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)