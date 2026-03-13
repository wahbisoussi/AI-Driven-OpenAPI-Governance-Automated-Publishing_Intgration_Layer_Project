from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.services.governance_service import run_governance_pipeline
from app.models.audit_results import StructuralReport, ViolationDetail
from app.api.v1.endpoints.specs import handle_ai_suggestions
from sqlalchemy import create_engine, false
from sqlalchemy.orm import sessionmaker
import os 

#Database Setup for Testing
LOCAL_DB_ADDR = "postgresql://postgres:admin123@localhost:5432/api_governance_db"
engine = create_engine(LOCAL_DB_ADDR)
SessionLocal = sessionmaker(autocommit=False, autoflush=False , bind=engine)

def run_fused_pipeline_test():
    db = SessionLocal()
    
    # 1. SETUP
    file_path = "test_spec_violation.yaml" # Change to test_spec_compliant.yaml to test the Green Lane
    
    print("\n" + "="*70)
    print("   BIAT-IT :FULL AI-DRIVEN OPENAPI GOVERNANCE AND AUTOMATED PUBLISHING PIPELINE TEST   ")
    print("="*70)
    print("--- About this Phase: ---")
    print("The BIAT-IT Spectral Engine will analyze the imported OpenAPI Spec")
    print("and verify if it follows the Microsoft REST API Guidelines.")
    print("Then, the AI Semantic Engine will check for redundancies.")
    print("Finally, the Governance Gate will make a deployment decision.")
    print(f"--- Target File: {file_path} ---\n")

    try:
        with open(file_path, "r") as f:
            content = f.read()

        # RUN THE MASTER ORCHESTRATOR
        result = run_governance_pipeline(
            db=db,
            title=file_path,
            version="1.0.0",
            content=content,
            user_id=1
        )
        
        spec_id = result["spec_id"]

        # ==========================================
        # PHASE 1: STRUCTURAL AUDIT (Spectral)
        # ==========================================
        print(f"\n[PHASE 1] STRUCTURAL AUDIT RESULTS")
        print("-" * 40)
        
        # Query DB to get the exact details like your old test_spectral.py did
        struct_report = db.query(StructuralReport).filter(StructuralReport.api_spec_id == spec_id).first()
        
        if struct_report:
            print(f"Score: {struct_report.score}/100")
            print(f"Errors: {struct_report.total_errors} | Warnings: {struct_report.total_warnings}")
            
            violations = db.query(ViolationDetail).filter(ViolationDetail.report_id == struct_report.id).all()
            if violations:
                print("\nViolations Detected:")
                for v in violations:
                    print(f"- [{v.rule_name}] ({v.severity.value}): {v.message}")
            else:
                print("\nNo violations found! Your spec is perfectly structured.")

        # ==========================================
        # PHASE 2: AI SEMANTIC ENGINE
        # ==========================================
        print(f"\n[PHASE 2] AI SEMANTIC ANALYSIS (Llama 3)")
        print("-" * 40)
        ai = result.get('ai_analysis')
        
        if ai and ai['similarity'] > 0:
            similarity_pct = round(ai['similarity'] * 100, 2)
            print(f"Similarity Score: {similarity_pct}% overlap with existing APIs.")
            
            if ai['suggestions']:
                print(f"\n[AI Fix Suggestions]:\n{ai['suggestions']}")
        else:
            print("No previous specs found for comparison or similarity is 0%.")

        # ==========================================
        # PHASE 2: FINAL GOVERNANCE GATE
        # ==========================================
        print(f"\n[PHASE 2] GOVERNANCE GATE DECISION")
        print("-" * 40)
        print(f"Current Pipeline Status: {result['status']}")
        print(f"Gate Decision: {result['governance_decision']}")
        print(f"Reason: {result['reason']}")

        # INTERACTIVE LOOP: Wait for Developer Fixes
        if result['governance_decision'] == "AWAITING_FIX_CONFIRMATION":
            print("\n" + "*" * 50)
            print("🛑 PIPELINE PAUSED: Developer action required.")
            print("*" * 50)
            user_input = input("Do you want to accept the AI fixes to proceed? (Y/N): ").strip().upper()
            
            accept_fixes = user_input == 'Y'
            
            # Call the endpoint logic directly
            interaction_result = handle_ai_suggestions(spec_id=spec_id, accept=accept_fixes, db=db)
            
            print("\n--- FINAL STATE AFTER DEVELOPER ACTION ---")
            print(f"Final Status: {interaction_result['status']}")
            print(f"Message: {interaction_result['message']}")

    except Exception as e:
        print(f"\n[!] Error running pipeline: {str(e)}")
    finally:
        db.close()
        print("\n" + "="*70)

if __name__ == "__main__":
    run_fused_pipeline_test()