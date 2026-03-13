from datetime import datetime, timezone

def evaluate_api_compliance(structural_score, ai_similarity, suggestions_accepted: bool = False):
    # RED LANE: Hard Block (Structural)
    if structural_score < 80.0:
        return {"status": "REJECTED", "reason": "Structural score below 80%."}

    # RED LANE: High Duplication + No Fix Accepted
    if ai_similarity >= 85.0 and not suggestions_accepted:
        return {
            "status": "REJECTED", 
            "reason": "Hard Redundancy detected (>=85%) and suggestions were not applied."
        }

    # YELLOW LANE: Moderate similarity, waiting for dev input
    if 70.0 <= ai_similarity < 85.0 and not suggestions_accepted:
        return {
            "status": "AWAITING_FIX_CONFIRMATION", 
            "reason": "AI detected overlap. Please review and accept suggestions to proceed."
        }

    # GREEN LANE: Clean API OR High similarity but developer FIXED it
    return {
        "status": "PROTOTYPE_READY",
        "reason": "Compliant: API passed or developer successfully applied AI fixations."
    }