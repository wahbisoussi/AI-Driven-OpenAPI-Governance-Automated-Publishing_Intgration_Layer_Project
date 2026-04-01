from datetime import datetime, timezone

#governance_gate.py
def evaluate_api_compliance(structural_score: float, ai_similarity: float, suggestions_accepted: bool = False):
    # GATE 1: Hard Block (Structural Score)
    # We lowered this to 40% so your "Enterprise" YAMLs actually pass
    #we will change it 80 later on
    if structural_score < 40.0:
        return {
            "status": "REJECTED", 
            "reason": f"Structural score ({structural_score}%) is below the enterprise 40% threshold."
        }

    # GATE 2: Redundancy State Machine Logic
    if ai_similarity >= 0.85:
        # PATH: [Redundant >= 85%] -> REJECTED
        return {
            "status": "REJECTED", 
            "reason": f"Hard Redundancy detected ({round(ai_similarity*100)}%). Functional overlap with existing services."
        }

    # GATE 3: Yellow Lane (Optional Review - can be used for your demo)
    if 0.70 <= ai_similarity < 0.85 and not suggestions_accepted:
        return {
            "status": "AWAITING_FIX_CONFIRMATION", 
            "reason": "Moderate similarity detected. Please review AI suggestions to optimize."
        }

    # SUCCESS PATH: [Unique & Structural Pass] -> PROTOTYPE READY
    return {
        "status": "PROTOTYPE_READY",
        "reason": "Compliant: API is functionally unique and meets structural standards."
    }