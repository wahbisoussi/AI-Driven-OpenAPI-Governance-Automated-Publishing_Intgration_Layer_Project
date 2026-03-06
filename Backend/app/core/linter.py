import subprocess
import json
import os
import re

def run_spectral_audit(file_path: str) -> list:
    """
    Executes Spectral linting and returns a list of violations.
    Uses regex to extract valid JSON even when mixed with CLI text.
    """
    # 1. Get the directory where linter.py resides
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    # 2. Construct the path: ...\backend\app\core\rulesets\main.yaml
    ruleset_path = os.path.join(current_dir, "rulesets", "main.yaml")
    
    # 3. Build the command
    cmd = [
        "spectral", "lint", file_path,
        "--ruleset", ruleset_path,
        "--format", "json"
    ]
    
    # 4. Run the command
    result = subprocess.run(cmd, capture_output=True, text=True, shell=True)
    
    # 5. Handle output
    # Use regex to find the content between the first '[' and last ']'
    json_match = re.search(r'\[.*\]', result.stdout, re.DOTALL)
    
    if json_match:
        try:
            return json.loads(json_match.group(0))
        except json.JSONDecodeError:
            print("Error: Failed to parse Spectral JSON output.")
            return []
    
    # If no JSON found, handle potential CLI messages or errors
    if result.stdout.strip():
        print(f"Spectral output (Non-JSON): {result.stdout.strip()[:100]}...")
        
    # If stdout is empty, check stderr
    if result.stderr:
        print(f"Spectral Error: {result.stderr.strip()}")
        
    return []