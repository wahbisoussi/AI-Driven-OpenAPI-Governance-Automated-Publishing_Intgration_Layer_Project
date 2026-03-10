import json
from app.core.linter import run_spectral_audit
from app.core.scoring import calculate_structural_score

#test_spectral.py
def test_pipeline():
    # Keep this fixed as you requested
    file_path = "test_spec_compliant.yaml" 
    
    print(f"--- Starting Spectral Audit on: {file_path} ---")
    
    # 1. Run the Linter (from your linter.py)
    # Ensure run_spectral_audit reads from 'file_path'
    violations = run_spectral_audit(file_path)
    
    # 2. Get Score (from your scoring.py)
    report = calculate_structural_score(violations)
    
    # 3. Display Results
    print(f"\nAudit Results:")
    print(f"Status: {report['status']}")
    print(f"Score: {report['score']}/100")
    print(f"Errors: {report['total_errors']} | Warnings: {report['total_warnings']}")
    
    if violations:
        print("\nViolations Detected:")
        for v in violations:
            # We print the code and the message to see exactly which rule failed
            print(f"- [{v.get('code')}]: {v.get('message')}")
    else:
        print("\nNo violations found! Your spec is perfect.")

if __name__ == "__main__":
    test_pipeline()