from sqlalchemy import Boolean, Column, String, Text, DateTime, ForeignKey, Enum, Integer
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.base import Base
from app.models.schemas import WorkflowStatus

class APISpecification(Base):
    __tablename__ = "api_specifications"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    version = Column(String, nullable=False)
    raw_content = Column(Text, nullable=False)
    workflow_status = Column(Enum(WorkflowStatus), default=WorkflowStatus.IMPORTED)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user_id = Column(Integer, ForeignKey("users.id"))
    
    # --- FIXED RELATIONSHIPS ---
    # These names (structural_report, governance_report) are what the other files 
    # must reference in their 'back_populates'
    structural_report = relationship("StructuralReport", back_populates="api_specification", uselist=False)
    governance_report = relationship("GovernanceReport", back_populates="api_specification", uselist=False)
    semantic_analysis = relationship("SemanticAnalysis", back_populates="api_specification", uselist=False)

    suggestions_applied = Column(Boolean, default=False)
    user_justification = Column(String, nullable=True)