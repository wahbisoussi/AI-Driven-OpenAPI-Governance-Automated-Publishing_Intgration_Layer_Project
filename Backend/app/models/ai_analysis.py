from sqlalchemy import Column, Boolean, Float, Text, ForeignKey, Integer
from pgvector.sqlalchemy import Vector
from app.db.base import Base

class SemanticAnalysis(Base):
    __tablename__ = "semantic_analysis"

    id = Column(Integer, primary_key=True, index=True)
    
    is_redundant = Column(Boolean, default=False)
    is_duplicated = Column(Boolean, default=False)
    similarity_score = Column(Float, nullable=True)
    ai_suggested_fix = Column(Text, nullable=True)
    
    # 384 dimensions matches your SentenceTransformer model perfectly
    embedding = Column(Vector(384))
    
    # CHANGE: Changed UUID to Integer to match APISpecification.id
    specification_id = Column(Integer, ForeignKey("api_specifications.id"), unique=True, nullable=False)