import yaml
from sentence_transformers import SentenceTransformer
from sqlalchemy.orm import Session
from app.models.ai_analysis import SemanticAnalysis
from app.models.specification import APISpecification

#vector_store.py
class VectorStore:
    def __init__(self):
        # Using a professional, industry-standard lightweight model (384 dimensions)
        self.model = SentenceTransformer('all-MiniLM-L6-v2')

    def _extract_searchable_text(self, spec_content: str) -> str:
        """Parses the YAML to extract intent-rich text for the AI."""
        try:
            data = yaml.safe_load(spec_content)
            title = data.get('info', {}).get('title', '')
            description = data.get('info', {}).get('description', '')
            
            # Extract all path summaries and descriptions
            paths_text = ""
            paths = data.get('paths', {})
            for path, methods in paths.items():
                for method, details in methods.items():
                    summary = details.get('summary', '')
                    paths_text += f" {path} {summary}"

            return f"{title} {description} {paths_text}".strip()
        except Exception:
            return spec_content[:1000] # Fallback to raw content if parsing fails

    def get_embedding(self, text: str):
        """Generates the 384-dimension vector."""
        return self.model.encode(text).tolist()

def find_most_similar(self, db: Session, current_spec_id: str, embedding: list):
        # 1. We build the query, but DON'T call .first() yet
        query = db.query(
            SemanticAnalysis,
            (1 - SemanticAnalysis.embedding.cosine_distance(embedding)).label("similarity")
        ).filter(SemanticAnalysis.specification_id != current_spec_id) \
         .order_by(SemanticAnalysis.embedding.cosine_distance(embedding))

        # 2. Now we execute it once
        result = query.first()
        
        # 3. Safety check: if the database is empty or no other specs exist
        if not result:
            return None
            
        return result # Returns (SemanticAnalysis object, similarity_score)