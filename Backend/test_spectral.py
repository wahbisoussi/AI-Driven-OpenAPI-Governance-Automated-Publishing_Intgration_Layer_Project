import json
from app.core.linter import run_spectral_audit
from app.core.scoring import calculate_structural_score

#test_spectral.py
def test_pipeline():

    print(f"--- Starting BIAT-IT Full AI-Driven Governance Audit ---")
    print(f"--- About this Phase: ---")
    print(f"the BIAT-IT Spectral Engine Will Analyze the Imported OpeAPI Spec")
    print(f"and it Will try to check If the Imported/Uploaded Spec follows the Microsoft REST API Guidelines")
    print(f"If there are any violations, it will provide a detailed report of the issues found, including the severity and location of each violation.") 
    # Keep this fixed as you requested
    # about the file path now its only for backend testing, in the future it will be dynamic based on the uploaded file by the developer On a Dashboard UI
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