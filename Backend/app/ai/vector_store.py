import yaml
from sentence_transformers import SentenceTransformer
from sqlalchemy.orm import Session
from app.models.ai_analysis import SemanticAnalysis
from app.models.specification import APISpecification

class VectorStore:
    def __init__(self):
        """
        Initializes the Embedding Model. 
        Model: all-MiniLM-L6-v2 (384 dimensions) - optimized for speed and CPU.
        """
        self.model = SentenceTransformer('all-MiniLM-L6-v2')

    def _extract_searchable_text(self, spec_content: str) -> str:
        """Parses the YAML to extract intent-rich text for the AI."""
        try:
            data = yaml.safe_load(spec_content)
            info = data.get('info', {})
            title = info.get('title', '')
            description = info.get('description', '')
            
            paths_text = ""
            paths = data.get('paths', {}) or {}
            for path, methods in paths.items():
                if isinstance(methods, dict):
                    for method, details in methods.items():
                        if isinstance(details, dict):
                            summary = details.get('summary', '')
                            paths_text += f" {path} {summary}"

            return f"{title} {description} {paths_text}".strip()
        except Exception:
            # Fallback to raw text if YAML is malformed
            return spec_content[:1000]

    def get_embedding(self, text: str):
        """Generates the 384-dimension vector."""
        return self.model.encode(text).tolist()

    def find_most_similar(self, db: Session, current_spec_id: int, embedding: list):
        """
        Queries PGVector for the most semantically similar API.
        Returns a tuple of (SemanticAnalysisRecord, similarity_score) or None.
        """
        # 1. We query for the record and the calculated similarity
        # Cosine distance operator (<->) returns 0 for identical, 2 for opposite.
        # We use (1 - distance) to map it to a 0.0 to 1.0 scale.
        query = db.query(
            SemanticAnalysis,
            (1 - SemanticAnalysis.embedding.cosine_distance(embedding)).label("similarity")
        ).filter(SemanticAnalysis.specification_id != current_spec_id) \
         .order_by(SemanticAnalysis.embedding.cosine_distance(embedding))

        result = query.first()
        
        if not result:
            return None
            
        return result # This contains (SemanticAnalysis object, float similarity)