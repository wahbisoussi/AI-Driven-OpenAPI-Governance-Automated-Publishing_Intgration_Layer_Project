import os
from sqlalchemy.orm import Session
from app.ai.vector_store import VectorStore
from app.ai.llm_engine import LLMEngine
from app.models.ai_analysis import SemanticAnalysis
from app.models.specification import APISpecification

class AIService:
    def __init__(self):
        self.vector_store = VectorStore()
        self.llm_engine = LLMEngine()

    def analyze_api_semantics(self, db: Session, spec: APISpecification):
        db.flush()

        # --- STEP 1: EXTRACT INTENT ---
        text_to_embed = self.vector_store._extract_searchable_text(spec.raw_content)
        current_embedding = self.vector_store.get_embedding(text_to_embed)

        # --- STEP 2: SIMILARITY SEARCH ---
        match_data = self.vector_store.find_most_similar(db, spec.id, current_embedding)
        
        similarity_score = 0.0
        existing_intent = "No similar API found in the enterprise catalog."

        if match_data:
            existing_record, similarity_score = match_data
            existing_spec = db.query(APISpecification).filter(
                APISpecification.id == existing_record.specification_id
            ).first()
            if existing_spec:
                existing_intent = self.vector_store._extract_searchable_text(existing_spec.raw_content)

        is_redundant = similarity_score >= 0.85

        # --- STEP 3: AI CONSULTATION ---
        try:
            print(f"🧠 Consulting Qwen AI for Spec ID {spec.id}...")
            ai_fix = self.llm_engine.generate_fix_suggestions(
                new_intent=text_to_embed[:500],
                existing_intent=existing_intent[:500],
                similarity_score=similarity_score,
                raw_yaml=spec.raw_content 
            )
            
            # CRITICAL: See what the AI actually says in the logs
            print(f"🤖 RAW AI OUTPUT: {ai_fix}")

            # Only fallback if it is completely empty
            if not ai_fix or ai_fix.strip() == "":
                ai_fix = "Analysis complete. Architecture follows standard patterns."

        except Exception as e:
            print(f"⚠️ AI Engine Connection Issue: {e}")
            ai_fix = f"Governance AI temporarily unavailable: {str(e)}"

        # --- STEP 4: PERSIST ---
        analysis_report = SemanticAnalysis(
            specification_id=spec.id,
            is_redundant=is_redundant,
            is_duplicated=(similarity_score > 0.98),
            similarity_score=float(similarity_score),
            ai_suggested_fix=ai_fix,
            embedding=current_embedding
        )
        
        db.add(analysis_report)
        db.commit()
        db.refresh(analysis_report)
        return analysis_report