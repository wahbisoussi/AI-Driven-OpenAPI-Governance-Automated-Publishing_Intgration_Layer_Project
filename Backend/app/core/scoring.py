from typing import List, Dict

def calculate_structural_score(violations: List[Dict]) -> Dict:
    """
    Analyzes Spectral violations. 
    Threshold: Score >= 80% for VALIDATED.
    """
    errors = [v for v in violations if v.get("severity") == 0]
    warnings = [v for v in violations if v.get("severity") == 1]
    
    count_errors = len(errors)
    count_warnings = len(warnings)
    
    # NEW DEMO LOGIC: Start at 100, but cap the penalty 
    # so the score stays high enough to trigger the AI Phase.
    base_score = 100 - (count_errors * 10) - (count_warnings * 2)
    
    # Force a minimum score of 45 if it's a valid OpenAPI structure
    # This guarantees Phase 3 (AI) will run.
    final_score = max(45, base_score) if count_errors < 15 else max(0, base_score)
    
    is_passed = (final_score >= 80) and (count_errors == 0) 
    
    return {
        "score": final_score,
        "total_errors": count_errors,
        "total_warnings": count_warnings,
        "is_passed": is_passed,
        "status": "VALIDATED" if is_passed else "REJECTED",
        "violations": violations 
    }