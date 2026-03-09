from sqlalchemy.orm import Session
from app.ai.vector_store import VectorStore
from app.ai.llm_engine import LLMEngine
from app.models.ai_analysis import SemanticAnalysis
from app.models.specification import APISpecification

class AIService:
    def __init__(self):
        # Initialize our two AI sub-components
        self.vector_store = VectorStore()
        self.llm_engine = LLMEngine()

    def analyze_api_semantics(self, db: Session, spec: APISpecification):
        """
        Orchestrates the Phase 3: AI-Driven Improvements & Duplicate Detection.
        1. Vectorizes the new API spec.
        2. Checks BIAT's catalog for existing overlaps.
        3. If similarity >= 85%, triggers Llama 3 for fix suggestions.
        """
        
        # 1. Generate the "Semantic Fingerprint" (Embedding)
        # We extract Title, Description, and Paths to understand functional intent
        text_to_embed = self.vector_store._extract_searchable_text(spec.raw_content)
        current_embedding = self.vector_store.get_embedding(text_to_embed)

        # 2. Perform Similarity Search in PostgreSQL (PGVector)
        # find_most_similar returns (SemanticAnalysis, similarity_score)
        match_data = self.vector_store.find_most_similar(db, spec.id, current_embedding)
        
        is_redundant = False
        similarity_score = 0.0
        ai_fix = "No significant redundancy detected. This API provides unique business value."

        if match_data:
            existing_record, similarity_score = match_data
            
            # 3. Apply the 85% Threshold Gate from your State Machine
            if similarity_score >= 0.85:
                is_redundant = True
                
                # Fetch the existing spec content to compare them via LLM
                existing_spec = db.query(APISpecification).filter(
                    APISpecification.id == existing_record.specification_id
                ).first()
                
                existing_intent = self.vector_store._extract_searchable_text(existing_spec.raw_content)
                
                # 4. Use Ollama (Llama 3) to generate professional fix suggestions
                ai_fix = self.llm_engine.generate_fix_suggestions(
                    new_intent=text_to_embed,
                    existing_intent=existing_intent,
                    similarity_score=similarity_score
                )

        # 5. Save the Analysis to the database (as per Class Diagram)
        analysis_report = SemanticAnalysis(
            specification_id=spec.id,
            is_redundant=is_redundant,
            is_duplicated=(similarity_score > 0.98), # Flag near-identical copies
            similarity_score=similarity_score,
            ai_suggested_fix=ai_fix,
            embedding=current_embedding
        )
        
        db.add(analysis_report)
        db.commit()
        db.refresh(analysis_report)
        
        return analysis_report