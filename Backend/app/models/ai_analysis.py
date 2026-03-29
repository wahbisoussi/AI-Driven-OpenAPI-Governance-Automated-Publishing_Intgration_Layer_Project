from sqlalchemy import Column, Integer, Boolean, Float, Text, ForeignKey
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector
from app.db.base import Base

class SemanticAnalysis(Base):
    __tablename__ = "semantic_analysis"

    id = Column(Integer, primary_key=True, index=True)
    is_redundant = Column(Boolean, default=False)
    is_duplicated = Column(Boolean, default=False)
    similarity_score = Column(Float, nullable=True)
    ai_suggested_fix = Column(Text, nullable=True)
    embedding = Column(Vector(384))
    
    specification_id = Column(Integer, ForeignKey("api_specifications.id"), unique=True, nullable=False)
    
    # Handshake with APISpecification.semantic_analysis
    api_specification = relationship("APISpecification", back_populates="semantic_analysis")