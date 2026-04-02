from sqlalchemy.orm import Session
from app.ai.vector_store import VectorStore
from app.ai.llm_engine import LLMEngine
from app.models.ai_analysis import SemanticAnalysis
from app.models.specification import APISpecification

class AIService:
    def __init__(self):
        """
        Initializes the Semantic Engine.
        - VectorStore: Handles PGVector embeddings and similarity search.
        - LLMEngine: Interface for Qwen AI (Ollama).
        """
        self.vector_store = VectorStore()
        self.llm_engine = LLMEngine()

    def analyze_api_semantics(self, db: Session, spec: APISpecification):
        """
        Executes the AI Semantic Phase of the Governance Pipeline.
        1. Vectorizes the new API.
        2. Searches for functional overlaps.
        3. Consults AI for architectural advice.
        """
        # Ensure the spec ID is available for the relationship
        db.flush()

        # --- STEP 1: EXTRACT INTENT & EMBED ---
        print(f"🔍 Extracting intent for: {spec.title}")
        # Converts raw YAML/JSON into a searchable text block
        text_to_embed = self.vector_store._extract_searchable_text(spec.raw_content)
        current_embedding = self.vector_store.get_embedding(text_to_embed)

        # --- STEP 2: SIMILARITY SEARCH (PGVector) ---
        print(f"🕵️ Searching for similar APIs in the database...")
        match_data = self.vector_store.find_most_similar(db, spec.id, current_embedding)
        
        is_redundant = False
        similarity_score = 0.0
        existing_intent = "No similar API found in the enterprise catalog."

        if match_data:
            existing_record, similarity_score = match_data
            print(f"📊 Highest Similarity Found: {round(similarity_score * 100, 2)}%")
            
            # Fetch the actual content of the 'match' to give context to the AI
            existing_spec = db.query(APISpecification).filter(
                APISpecification.id == existing_record.specification_id
            ).first()
            
            if existing_spec:
                existing_intent = self.vector_store._extract_searchable_text(existing_spec.raw_content)

        # --- STEP 3: STATE MACHINE DECISION ---
        # 0.85 (85%) is the Hard Redundancy threshold defined in your diagram
        if similarity_score >= 0.85:
            is_redundant = True
            print(f"❌ REDUNDANCY DETECTED: API matches an existing service.")
        else:
            is_redundant = False
            print(f"✅ UNIQUE API: No functional overlap detected.")

        # --- STEP 4: AI CONSULTATION ---
        # We always call the AI so the 'suggestions' field is never empty
        try:
            print(f"🧠 Consulting Qwen AI for architectural justification...")
            ai_fix = self.llm_engine.generate_fix_suggestions(
                new_intent=text_to_embed,
                existing_intent=existing_intent,
                similarity_score=similarity_score,
                raw_yaml=spec.raw_content # Passed but ignored by prompt to save RAM
            )
        except Exception as e:
            ai_fix = f"Governance AI Error (Timeout/Offline): {str(e)}"

        # --- STEP 5: PERSIST ANALYSIS ---
        analysis_report = SemanticAnalysis(
            specification_id=spec.id,
            is_redundant=is_redundant,
            is_duplicated=(similarity_score > 0.98), # Exact copy check
            similarity_score=float(similarity_score),
            ai_suggested_fix=ai_fix,
            embedding=current_embedding
        )
        
        try:
            db.add(analysis_report)
            db.commit()
            db.refresh(analysis_report)
            print(f"✅ Semantic Analysis saved successfully for Spec ID {spec.id}")
        except Exception as e:
            db.rollback()
            print(f"❌ Database Error during AI Save: {str(e)}")
        
        return analysis_report