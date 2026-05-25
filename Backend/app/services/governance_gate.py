from datetime import datetime, timezone

#governance_gate.py
def evaluate_api_compliance(structural_score: float, ai_similarity: float, suggestions_accepted: bool = False, is_admin: bool = True):

    # ── NORMAL USER (DEV) ROUTING ──────────────────────────────────────────────
    if not is_admin:
        # Always block hard duplicates regardless of role
        if ai_similarity >= 0.85:
            return {
                "status": "REJECTED",
                "reason": f"Hard Redundancy detected ({round(ai_similarity * 100)}%). Functional overlap with existing services."
            }
        if structural_score < 50.0:
            return {
                "status": "REJECTED",
                "reason": f"Structural score ({round(structural_score, 1)}%) is below the 50% minimum threshold. Fix critical errors before resubmitting."
            }
        if structural_score < 80.0:
            return {
                "status": "PENDING_APPROVAL",
                "reason": f"Structural score ({round(structural_score, 1)}%) is between 50–80%. Awaiting admin review and approval before WSO2 publication."
            }
        return {
            "status": "APPROVED",
            "reason": f"Score {round(structural_score, 1)}% ≥ 80% threshold. API auto-approved and queued for WSO2 deployment."
        }

    # ── ADMIN ROUTING (UNTOUCHED) ──────────────────────────────────────────────
    if structural_score < 40.0:
        return {
            "status": "REJECTED",
            "reason": f"Structural score ({structural_score}%) is below the enterprise 40% threshold."
        }
    if ai_similarity >= 0.85:
        return {
            "status": "REJECTED",
            "reason": f"Hard Redundancy detected ({round(ai_similarity*100)}%). Functional overlap with existing services."
        }
    if 0.70 <= ai_similarity < 0.85 and not suggestions_accepted:
        return {
            "status": "AWAITING_FIX_CONFIRMATION",
            "reason": "Moderate similarity detected. Please review AI suggestions to optimize."
        }
    return {
        "status": "PROTOTYPE_READY",
        "reason": "Compliant: API is functionally unique and meets structural standards."
    }