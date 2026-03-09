from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.services.governance_service import run_governance_pipeline

#test_ai_governance.py
def test_full_ai_pipeline():
    db = SessionLocal()
    
    # Simulate a developer uploading an API
    # Make sure this file exists in your directory
    file_path = "test_spec_violation.yaml" 
    
    print(f"--- Starting Full AI-Driven Governance Audit ---")
    
    with open(file_path, "r") as f:
        content = f.read()

    # This now runs BOTH Spectral and the AI Semantic Engine
    result = run_governance_pipeline(
        db=db,
        title="Payment_API_V1.yaml",
        version="1.0.0",
        content=content,
        user_id=1
    )

    print(f"\n[1] Structural Results:")
    print(f"Score: {result['structural_score']}/100")
    print(f"Status: {result['status']}")

    print(f"\n[2] AI Semantic Results:")
    ai = result.get('ai_analysis')
    if ai['similarity']:
        print(f"Similarity Score: {round(ai['similarity']*100, 2)}%")
        print(f"Is Redundant: {ai['is_redundant']}")
        print(f"\n[3] AI Fix Suggestions (Llama 3):")
        print(ai['suggestions'])
    else:
        print("No previous specs found for comparison. This is the first entry.")

if __name__ == "__main__":
    test_full_ai_pipeline()