import os
import requests

class LLMEngine:
    def __init__(self):
        # In Docker Compose, 'ollama' is the hostname. 
        # We look for the env var, but default to the Docker service name.
        self.url = os.getenv("OLLAMA_URL", "http://ollama:11434/api/generate")
        self.model = "llama3"

    def generate_fix_suggestions(self, new_intent: str, existing_intent: str, similarity_score: float, raw_yaml: str) -> str:
        """
        Calls Ollama to generate advice AND specific OpenAPI YAML corrections.
        """
        similarity_percent = round(similarity_score * 100, 2)
        
        prompt = f"""
        Context: BIAT-IT API Governance System. You are a Senior API Architect.
        Issue: Functional Redundancy Detected ({similarity_percent}% similarity).
        
        New API Intent: {new_intent}
        Existing API in Catalog: {existing_intent}
        
        Here is the submitted OpenAPI YAML:
        {raw_yaml}
        
        Task:
        1. Explain briefly why these APIs are considered redundant.
        2. Provide a 'Fix Suggestion' for the developer.
        3. IMPORTANT: Provide a specific YAML snippet showing exactly how the developer should rewrite or merge their OpenAPI spec to resolve this duplication.
        Keep the tone professional and concise for a technical report.
        """

        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False
        }

        try:
            # 120s timeout for cold-start
            response = requests.post(self.url, json=payload, timeout=120)
            response.raise_for_status()
            return response.json().get('response', "AI could not generate a suggestion at this time.")
        except Exception as e:
            return f"Governance AI Error: {str(e)}"