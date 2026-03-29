import yaml
from sentence_transformers import SentenceTransformer
from sqlalchemy.orm import Session
from app.models.ai_analysis import SemanticAnalysis
from app.models.specification import APISpecification

class VectorStore:
    def __init__(self):
        # Using a professional, industry-standard lightweight model (384 dimensions)
        self.model = SentenceTransformer('all-MiniLM-L6-v2')

    def _extract_searchable_text(self, spec_content: str) -> str:
        """Parses the YAML to extract intent-rich text for the AI."""
        try:
            data = yaml.safe_load(spec_content)
            info = data.get('info', {})
            title = info.get('title', '')
            description = info.get('description', '')
            
            paths_text = ""
            paths = data.get('paths', {})
            for path, methods in paths.items():
                if isinstance(methods, dict):
                    for method, details in methods.items():
                        if isinstance(details, dict):
                            summary = details.get('summary', '')
                            paths_text += f" {path} {summary}"

            return f"{title} {description} {paths_text}".strip()
        except Exception:
            return spec_content[:1000]

    def get_embedding(self, text: str):
        """Generates the 384-dimension vector."""
        return self.model.encode(text).tolist()

    # FIX: Now properly inside the class
    def find_most_similar(self, db: Session, current_spec_id: int, embedding: list):
        """
        Queries PGVector for the most semantically similar API.
        """
        # 1. Build the query using cosine distance (<-> operator in PGVector)
        # We calculate (1 - distance) to get a similarity score (0 to 1)
        query = db.query(
            SemanticAnalysis,
            (1 - SemanticAnalysis.embedding.cosine_distance(embedding)).label("similarity")
        ).filter(SemanticAnalysis.specification_id != current_spec_id) \
         .order_by(SemanticAnalysis.embedding.cosine_distance(embedding))

        # 2. Execute and get the best match
        result = query.first()
        
        # 3. If no other records exist in semantic_analysis, result will be None
        if not result:
            return None
            
        return result