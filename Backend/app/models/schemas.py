import enum
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict

# --- EXISTING ENUMS (KEPT) ---
class WorkflowStatus(enum.Enum):
    IMPORTED = "IMPORTED"
    VALIDATED = "VALIDATED"
    AI_REVIEWED = "AI_REVIEWED"
    PENDING_REVIEW = "PENDING_REVIEW"
    PROTOTYPE_READY = "PROTOTYPE_READY"
    PUBLISHED = "PUBLISHED"
    REJECTED = "REJECTED"

class Severity(enum.Enum):
    ERROR = "ERROR"
    WARNING = "WARNING"
    INFO = "INFO"

class WSO2State(enum.Enum):
    CREATED = "CREATED"
    PROTOTYPED = "PROTOTYPED"
    PUBLISHED = "PUBLISHED"
    DEPRECATED = "DEPRECATED"

class ManualReviewPayload(BaseModel):
    decision: str
    notes: str

# --- NEW UPDATES (ADDED) ---

class SemanticAnalysisRead(BaseModel):
    id: int
    is_redundant: bool
    is_duplicated: bool
    similarity_score: Optional[float] = None
    ai_suggested_fix: Optional[str] = None  # This maps to your DB column

    model_config = ConfigDict(from_attributes=True)

class APISpecificationRead(BaseModel):
    id: int
    title: str
    version: str
    raw_content: str
    workflow_status: WorkflowStatus
    created_at: datetime
    suggestions_applied: bool
    user_justification: Optional[str] = None
    user_id: Optional[int] = None
    
    # This nests the SemanticAnalysis data inside the Spec response
    semantic_analysis: Optional[SemanticAnalysisRead] = None 

    model_config = ConfigDict(from_attributes=True)