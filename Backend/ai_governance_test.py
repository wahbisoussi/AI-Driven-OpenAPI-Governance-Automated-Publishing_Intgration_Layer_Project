import requests
import json

# Replace with your actual Ollama URL (usually localhost:11434)
OLLAMA_URL = "http://localhost:11434/api/generate"

def test_ai_governance():
    # This represents the API details we just published
    api_data = {
        "name": "PFETestAPI",
        "description": "This is a test API for my PFE project.",
        "version": "1.0.0",
        "context": "/pfe-test"
    }

    prompt = f"""
    Analyze the following API metadata for governance compliance:
    {json.dumps(api_data)}
    
    Rules:
    1. Description must be detailed (more than 10 words).
    2. Versioning must follow SemVer (x.y.z).
    
    Provide a score out of 100 and a 'Status' (PASS/FAIL).
    """

    print("--- Sending API to AI for Governance Audit ---")
    payload = {
        "model": "llama3", # or your preferred model
        "prompt": prompt,
        "stream": False
    }

    try:
        response = requests.post(OLLAMA_URL, json=payload)
        result = response.json()
        print("\n--- AI GOVERNANCE REPORT ---")
        print(result.get("response"))
    except Exception as e:
        print(f"Error connecting to Ollama: {e}")

if __name__ == "__main__":
    test_ai_governance()