import enum
from pydantic import BaseModel
# schemas.py
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