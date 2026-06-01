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

def run_governance_pipeline(db: Session, title: str, version: str, content: str, user_id: int, is_admin: bool = True):
    ai_service = AIService()

    # --- 1. INITIAL RECORD (always first — every return path needs a spec_id) ---
    new_spec = APISpecification(title=title, version=version, raw_content=content, user_id=user_id, workflow_status=WorkflowStatus.IMPORTED)
    db.add(new_spec)
    db.commit()
    db.refresh(new_spec)

    temp_file_path = f"temp_spec_{new_spec.id}.yaml"
    with open(temp_file_path, "w") as f: f.write(content)

    try:
        # --- 2. DUPLICATE DETECTION ---
        text_to_embed = ai_service.vector_store._extract_searchable_text(content)
        current_embedding = ai_service.vector_store.get_embedding(text_to_embed)
        match_data = ai_service.vector_store.find_most_similar(db, new_spec.id, current_embedding)
        if match_data and match_data[1] > 0.98:
            new_spec.workflow_status = WorkflowStatus.REJECTED
            new_spec.rejection_reason = "Exact duplicate detected. This API already exists in the enterprise catalog."
            db.commit()
            return {
                "spec_id": new_spec.id,
                "status": WorkflowStatus.REJECTED.value,
                "governance_decision": "REJECTED",
                "structural_score": 0,
                "violations": [],
                "refactored_yaml": content,
                "ai_analysis": {"similarity": float(match_data[1]), "suggestions": "Exact duplicate API detected. This specification is identical to an existing catalog entry."},
                "deployment_status": "FAILED"
            }
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
                # Only rewrite YAML when there are actual structural violations to fix
                has_violations = audit_results.get("total_errors", 0) > 0 or audit_results.get("total_warnings", 0) > 0
                if ai_report.ai_suggested_fix and has_violations:
                    from app.ai.llm_engine import LLMEngine
                    fixed_content = LLMEngine().apply_suggestion_to_yaml(content, ai_report.ai_suggested_fix)
                    if fixed_content and "openapi" in fixed_content.lower():
                        # Guard: reject AI fix if it creates duplicate operationIds (breaks WSO2)
                        op_ids = [l.split("operationId:")[-1].strip() for l in fixed_content.splitlines() if "operationId:" in l]
                        if len(op_ids) == len(set(op_ids)):
                            new_spec.raw_content = fixed_content
                            new_spec.suggestions_applied = True
                            with open(temp_file_path, "w") as f: f.write(fixed_content)
                        else:
                            print(f"⚠️ AI fix produced duplicate operationIds — keeping original content")

        # --- 5. GOVERNANCE GATE EVALUATION ---
        # 'report' is now defined above
        gate = evaluate_api_compliance(report.score, similarity_score, new_spec.suggestions_applied, is_admin=is_admin)
        # Map gate statuses that have no matching WorkflowStatus enum value:
        #   "APPROVED"                → PUBLISHED  (dev ≥80%, WSO2 block below overwrites on failure)
        #   "AWAITING_FIX_CONFIRMATION" → PROTOTYPE_READY  (admin moderate similarity, still deploys via specs.py)
        _gate_to_status = {
            "APPROVED": WorkflowStatus.PUBLISHED,
            "AWAITING_FIX_CONFIRMATION": WorkflowStatus.PROTOTYPE_READY,
        }
        new_spec.workflow_status = _gate_to_status.get(gate["status"]) or WorkflowStatus(gate["status"])

        db.add(GovernanceReport(
            api_spec_id=new_spec.id,
            structural_score=report.score,
            ai_similarity_score=similarity_score,
            final_decision=gate["status"],
            reason=gate["reason"]
        ))
        db.commit()

        # --- 6. WSO2 DEPLOYMENT (Integrated) ---
        # "APPROVED" = normal user with score ≥80% (auto-publish path)
        # "PROTOTYPE_READY" = admin success path (specs.py handles WSO2 for admin)
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
                    new_spec.external_id = api_id
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
            "structural_score": report.score,
            "violations": audit_results["violations"],
            "refactored_yaml": new_spec.raw_content,
            "ai_analysis": {
                "similarity": similarity_score,
                "suggestions": ai_suggestions
            },
            "deployment_status": (
                "SUCCESS" if new_spec.workflow_status == WorkflowStatus.PUBLISHED
                else "PENDING" if new_spec.workflow_status == WorkflowStatus.PENDING_APPROVAL
                else "FAILED"
            )
        }

    except Exception as e:
        db.rollback()
        print(f"❌ PIPELINE CRASH: {e}")
        return {"status": "ERROR", "reason": str(e), "spec_id": new_spec.id}
    finally:
        if os.path.exists(temp_file_path): 
            os.remove(temp_file_path)