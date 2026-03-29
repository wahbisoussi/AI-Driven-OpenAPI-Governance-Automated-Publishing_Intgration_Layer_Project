from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from datetime import datetime, timezone
from app.db.base import Base
from sqlalchemy.orm import relationship

class GovernanceReport(Base):
    __tablename__ = "governance_reports"

    id = Column(Integer, primary_key=True, index=True)
    api_spec_id = Column(Integer, ForeignKey("api_specifications.id"), nullable=False)
    
    structural_score = Column(Float, nullable=False)
    ai_similarity_score = Column(Float, nullable=True)
    
    final_decision = Column(String, nullable=False) 
    reason = Column(String, nullable=False)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    reviewed_by = Column(String, nullable=True)
    reviewer_notes = Column(String, nullable=True)

    # --- FIXED HANDSHAKE ---
    # Matches 'governance_report' in specification.py
    api_specification = relationship("APISpecification", back_populates="governance_report")