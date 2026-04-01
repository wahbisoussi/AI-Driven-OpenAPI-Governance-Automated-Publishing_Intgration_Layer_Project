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
        # Ensure the spec is flushed so we can link the ID
        db.flush()

        # 1. Generate Embedding
        print(f"🔍 Extracting intent for: {spec.title}")
        text_to_embed = self.vector_store._extract_searchable_text(spec.raw_content)
        current_embedding = self.vector_store.get_embedding(text_to_embed)

        # 2. Perform Similarity Search
        print(f"🕵️ Searching for similar APIs in the database...")
        match_data = self.vector_store.find_most_similar(db, spec.id, current_embedding)
        
        is_redundant = False
        similarity_score = 0.0
        ai_fix = "No significant redundancy detected. This API appears unique."

        if match_data:
            existing_record, similarity_score = match_data
            print(f"📊 Highest Similarity Found: {round(similarity_score * 100, 2)}%")
            
            if similarity_score >= 0.85:
                is_redundant = True
                
                existing_spec = db.query(APISpecification).filter(
                    APISpecification.id == existing_record.specification_id
                ).first()
                
                existing_intent = self.vector_store._extract_searchable_text(existing_spec.raw_content)
                
                # 3. Call Ollama
                print(f"🧠 Calling Phi-3 for architectural advice...")
                try:
                    ai_fix = self.llm_engine.generate_fix_suggestions(
                        new_intent=text_to_embed,
                        existing_intent=existing_intent,
                        similarity_score=similarity_score,
                        raw_yaml=spec.raw_content
                    )
                except Exception as e:
                    ai_fix = f"AI Suggestions offline: {str(e)}"

        # 4. Save result to SemanticAnalysis table
        analysis_report = SemanticAnalysis(
            specification_id=spec.id,
            is_redundant=is_redundant,
            is_duplicated=(similarity_score > 0.98),
            similarity_score=float(similarity_score),
            ai_suggested_fix=ai_fix,
            embedding=current_embedding
        )
        
        try:
            db.add(analysis_report)
            db.commit()
            db.refresh(analysis_report)
            print(f"✅ Semantic Analysis saved for ID {spec.id}")
        except Exception as e:
            db.rollback()
            print(f"❌ DB Error: {str(e)}")
        
        return analysis_report