from app.ai.vector_store import VectorStore
from app.ai.llm_engine import LLMEngine

def test_ai_phase():
    # 1. Initialize Engines
    vector_engine = VectorStore()
    llama_engine = LLMEngine()

    # 2. Point to the file you want to test
    file_path = "audit_test_fixed.yaml" 
    print(f"--- [PHASE 3] Starting AI Semantic Analysis on: {file_path} ---")

    # 3. Load the actual file content
    with open(file_path, "r") as f:
        content = f.read()

    # 4. Extract Intent (Semantic Matching)
    new_intent = vector_engine._extract_searchable_text(content)
    print(f"Extracted Intent from file: {new_intent}")

    # 5. Simulate comparison against existing DB intent
    existing_intent = "Financial Transaction Service. Handles customer billing and credit card processing."

    # 6. Generate Fix Suggestions via Llama 3
    print("\nCalling Llama 3 for Governance Advice...")
    suggestions = llama_engine.generate_fix_suggestions(
        new_intent=new_intent,
        existing_intent=existing_intent,
        similarity_score=0.88
    )

    print("\n--- GOVERNANCE REPORT (LLAMA 3) ---")
    print(suggestions)

if __name__ == "__main__":
    test_ai_phase()