from datetime import datetime, timezone

def evaluate_api_compliance(structural_score: float, ai_similarity: float, suggestions_accepted: bool = False):
    # RED LANE: Hard Block (Structural) - Score is 0-100
    if structural_score < 80.0:
        return {"status": "REJECTED", "reason": "Structural score below 80%."}

    # RED LANE: High Duplication + No Fix Accepted
    # ai_similarity is 0.0 to 1.0, so 85% is 0.85
    if ai_similarity >= 0.85 and not suggestions_accepted:
        return {
            "status": "REJECTED", 
            "reason": "Hard Redundancy detected (>=85%) and suggestions were not applied."
        }

    # YELLOW LANE: Moderate similarity (70% to 85%), waiting for dev input
    if 0.70 <= ai_similarity < 0.85 and not suggestions_accepted:
        return {
            "status": "AWAITING_FIX_CONFIRMATION", 
            "reason": "AI detected overlap. Please review and accept suggestions to proceed."
        }

    # GREEN LANE: Clean API OR High similarity but developer FIXED it
    return {
        "status": "PROTOTYPE_READY",
        "reason": "Compliant: API passed or developer successfully applied AI fixes."
    }