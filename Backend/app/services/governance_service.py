import os
import time
from sqlalchemy.orm import Session
from app.models.specification import APISpecification
from app.models.audit_results import StructuralReport, ViolationDetail
from app.models.governance_report import GovernanceReport
from app.models.schemas import WorkflowStatus, Severity
from app.core.linter import run_spectral_audit
from app.core.scoring import calculate_structural_score
from app.services.ai_service import AIService
from app.services.governance_gate import evaluate_api_compliance

MIN_SCORE_FOR_AI = 10

def run_governance_pipeline(db: Session, title: str, version: str, content: str, user_id: int):
    ai_service = AIService()

    # --- 1. DUPLICATE DETECTION ---
    text_to_embed = ai_service.vector_store._extract_searchable_text(content)
    current_embedding = ai_service.vector_store.get_embedding(text_to_embed)
    match_data = ai_service.vector_store.find_most_similar(db, -1, current_embedding)
    if match_data and match_data[1] > 0.98:
        return {"status": "REJECTED", "reason": "Duplicate API detected."}

    # --- 2. INITIAL RECORD ---
    new_spec = APISpecification(title=title, version=version, raw_content=content, user_id=user_id, workflow_status=WorkflowStatus.IMPORTED)
    db.add(new_spec)
    db.commit()
    db.refresh(new_spec)

    temp_file_path = f"temp_spec_{new_spec.id}.yaml"
    with open(temp_file_path, "w") as f: f.write(content)

    try:
        # --- 3. STRUCTURAL AUDIT (Spectral) ---
        raw_violations = run_spectral_audit(temp_file_path)
        audit_results = calculate_structural_score(raw_violations)
        
        # 🟢 FIXED: Corrected indentation for structural audit results
        print(f"📊 STRUCTURAL AUDIT RESULTS:")
        print(f"   Score: {audit_results['score']}%")
        print(f"   Errors: {audit_results['total_errors']}")
        print(f"   Warnings: {audit_results['total_warnings']}")
        if audit_results['violations']:
            print(f"   Top Violations:")
            for v in audit_results['violations'][:3]:  # Show first 3
                print(f"     - {v.get('message', 'Unknown error')}")
        
        # FIX: Define the 'report' variable here so it can be used in Step 5
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
                rule_name=v.get("code"),
                severity=sev,
                message=v.get("message"),
                report_id=report.id
            ))

        # --- 4. AI SEMANTIC ANALYSIS & AUTO-FIX ---
        similarity_score = 0.0
        ai_suggestions = "Analysis complete."
        if report.score >= MIN_SCORE_FOR_AI:
            ai_report = ai_service.analyze_api_semantics(db, new_spec)
            if ai_report:
                similarity_score = float(ai_report.similarity_score)
                ai_suggestions = ai_report.ai_suggested_fix or ai_suggestions
                if ai_report.ai_suggested_fix:
                    from app.ai.llm_engine import LLMEngine
                    fixed_content = LLMEngine().apply_suggestion_to_yaml(content, ai_report.ai_suggested_fix)
                    if fixed_content:
                        new_spec.raw_content = fixed_content
                        new_spec.suggestions_applied = True
                        with open(temp_file_path, "w") as f: f.write(fixed_content)

        # --- 5. GOVERNANCE GATE EVALUATION ---
        # 'report' is now defined above
        gate = evaluate_api_compliance(report.score, similarity_score, new_spec.suggestions_applied)
        new_spec.workflow_status = WorkflowStatus(gate["status"])

        db.add(GovernanceReport(
            api_spec_id=new_spec.id,
            structural_score=report.score,
            ai_similarity_score=similarity_score,
            final_decision=gate["status"],
            reason=gate["reason"]
        ))
        db.commit()

        # --- 6. WSO2 DEPLOYMENT (Integrated) ---
        if gate["status"] == "APPROVED":
            try:
                from app.services.publisher_service import import_api_from_yaml
                import tempfile
                
                # Create temporary file for WSO2 import
                with tempfile.NamedTemporaryFile(mode='w', suffix='.yaml', delete=False) as temp_file:
                    temp_file.write(new_spec.raw_content)
                    temp_file_path = temp_file.name
                
                print(f"🚀 DEPLOYING TO WSO2: {new_spec.title}")
                print("📋 This will: Create API -> Business Plan -> Revision -> Wait for manual deploy -> Auto-publish")
                
                api_id = import_api_from_yaml(temp_file_path)
                
                if api_id:
                    print(f"✅ WSO2 DEPLOYMENT SUCCESS: API ID {api_id}")
                    new_spec.workflow_status = WorkflowStatus.PUBLISHED
                    db.commit()
                else:
                    print(f"❌ WSO2 DEPLOYMENT FAILED")
                    new_spec.workflow_status = WorkflowStatus.REJECTED
                    db.commit()
                    
            except Exception as deploy_error:
                print(f"❌ DEPLOYMENT EXCEPTION: {deploy_error}")
                new_spec.workflow_status = WorkflowStatus.REJECTED
                db.commit()
        else:
            print(f"🚫 GOVERNANCE REJECTED: Skipping WSO2 deployment")

        return {
            "spec_id": new_spec.id,
            "status": new_spec.workflow_status.value,
            "governance_decision": gate["status"], 
            "structural_score": report.score,  # ✅ ADDED: Your score is back
            "violations": audit_results["violations"], # ✅ ADDED: Your audit details are back
            "refactored_yaml": new_spec.raw_content, # ✅ ADDED: See the AI changes
            "ai_analysis": {
                "similarity": similarity_score,
                "suggestions": ai_suggestions
            },
            "deployment_status": "SUCCESS" if new_spec.workflow_status == WorkflowStatus.PUBLISHED else "FAILED"
        }

    except Exception as e:
        db.rollback()
        print(f"❌ PIPELINE CRASH: {e}")
        return {"status": "ERROR", "reason": str(e)}
    finally:
        if os.path.exists(temp_file_path): 
            os.remove(temp_file_path)