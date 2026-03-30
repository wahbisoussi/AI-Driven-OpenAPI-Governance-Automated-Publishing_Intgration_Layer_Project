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
        # 1. ENSURE DATA VISIBILITY
        # Force the DB to acknowledge the Spec exists before we link to it
        db.flush()

        # 2. Generate Embedding
        text_to_embed = self.vector_store._extract_searchable_text(spec.raw_content)
        current_embedding = self.vector_store.get_embedding(text_to_embed)

        # 3. Perform Similarity Search
        match_data = self.vector_store.find_most_similar(db, spec.id, current_embedding)
        
        is_redundant = False
        similarity_score = 0.0
        ai_fix = "No significant redundancy detected."

        if match_data:
            # Unpack the tuple (Object, Score)
            existing_record, similarity_score = match_data
            
            if similarity_score >= 0.85:
                is_redundant = True
                
                # Fetch existing spec for LLM comparison
                existing_spec = db.query(APISpecification).filter(
                    APISpecification.id == existing_record.specification_id
                ).first()
                
                existing_intent = self.vector_store._extract_searchable_text(existing_spec.raw_content)
                
                # 4. Use Ollama for Suggestions
                try:
                    ai_fix = self.llm_engine.generate_fix_suggestions(
                        new_intent=text_to_embed,
                        existing_intent=existing_intent,
                        similarity_score=similarity_score,
                        raw_yaml=spec.raw_content
                    )
                except Exception as e:
                    print(f"⚠️ Ollama Suggestion Error: {e}")
                    ai_fix = "AI Suggestions temporarily unavailable."

        # 5. SAVE ANALYSIS WITH ERROR HANDLING
        analysis_report = SemanticAnalysis(
            specification_id=spec.id,
            is_redundant=is_redundant,
            is_duplicated=(similarity_score > 0.98),
            similarity_score=float(similarity_score), # Safety cast
            ai_suggested_fix=ai_fix,
            embedding=current_embedding
        )
        
        try:
            db.add(analysis_report)
            db.commit() # The critical moment!
            db.refresh(analysis_report)
            print(f"✅ AI Analysis permanently saved for Spec {spec.id}")
        except Exception as e:
            db.rollback()
            # THIS IS THE LOG WE NEED TO SEE IN DOCKER
            print(f"❌ CRITICAL DATABASE ERROR: {str(e)}")
        
        return analysis_report