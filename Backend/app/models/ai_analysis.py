import uuid
from sqlalchemy import Column, Boolean, Float, Text, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from pgvector.sqlalchemy import Vector
from app.db.base import Base

class SemanticAnalysis(Base):
    __tablename__ = "semantic_analysis"

    # Integer Primary Key as requested
    id = Column(Integer, primary_key=True, index=True)
    
    # Core AI Analysis Fields (Mapped from Class Diagram)
    is_redundant = Column(Boolean, default=False)
    is_duplicated = Column(Boolean, default=False)
    similarity_score = Column(Float, nullable=True)
    ai_suggested_fix = Column(Text, nullable=True)
    
    # PGVector Embedding Column 
    # We use 384 dimensions to match common sentence-transformer models (like all-MiniLM-L6-v2)
    embedding = Column(Vector(384))
    
    # Relationship mapping to APISpecification (Keep UUID here to match your spec model)
    specification_id = Column(UUID(as_uuid=True), ForeignKey("api_specifications.id"), unique=True, nullable=False)