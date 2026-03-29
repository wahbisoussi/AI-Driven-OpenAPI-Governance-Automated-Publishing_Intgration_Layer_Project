from sqlalchemy import Column, Integer, Boolean, String, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.db.base import Base
from app.models.schemas import Severity

class StructuralReport(Base):
    __tablename__ = "structural_reports"
    id = Column(Integer, primary_key=True, index=True)
    score = Column(Integer, nullable=False)
    isPassed = Column(Boolean, default=False)
    total_errors = Column(Integer, default=0)
    total_warnings = Column(Integer, default=0)

    api_spec_id = Column(Integer, ForeignKey("api_specifications.id"))
    
    # Handshake with APISpecification.structural_report
    api_specification = relationship("APISpecification", back_populates="structural_report")
    
    violations = relationship("ViolationDetail", back_populates="report", cascade="all, delete-orphan")

class ViolationDetail(Base):
    __tablename__ = "violation_details"
    id = Column(Integer, primary_key=True, index=True)
    rule_name = Column(String, nullable=False)
    severity = Column(Enum(Severity), nullable=False)
    message = Column(String, nullable=False)
    line_number = Column(Integer, nullable=True)
    
    report_id = Column(Integer, ForeignKey("structural_reports.id"))
    # Use back_populates instead of backref for consistency
    report = relationship("StructuralReport", back_populates="violations")