from typing import List, Dict

#scoring.py

def calculate_structural_score(violations: List[Dict]) -> Dict:
    """
    Analyzes Spectral violations to produce a score and pass/fail status.
    Threshold: Score >= 80% is REQUIRED to move to 'VALIDATED'.
    """
    # Filter by severity (0: Error, 1: Warning)
    errors = [v for v in violations if v.get("severity") == 0]
    warnings = [v for v in violations if v.get("severity") == 1]
    
    count_errors = len(errors)
    count_warnings = len(warnings)
    
    # Professional Scoring Logic:
    # Starts at 100. -10 per Error, -2 per Warning.
    score_calculation = 100 - (count_errors * 10) - (count_warnings * 2)
    final_score = max(0, score_calculation)
    
    # Logic based on State Machine Diagram
    # Status: 80-100 = VALIDATED | 0-79 = REJECTED
    is_passed = (final_score >= 80) and (count_errors == 0) 
    
    return {
        "score": final_score,
        "total_errors": count_errors,
        "total_warnings": count_warnings,
        "is_passed": is_passed,
        "status": "VALIDATED" if is_passed else "REJECTED",
        "violations": violations  # Passed back for storage in ViolationDetail table
    }