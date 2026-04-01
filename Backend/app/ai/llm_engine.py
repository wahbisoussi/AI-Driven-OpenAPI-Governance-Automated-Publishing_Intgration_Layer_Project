import os
import requests

class LLMEngine:
    def __init__(self):
        # This pulls http://ollama:11434/api/generate from your .env/docker-compose
        self.url = os.getenv("OLLAMA_URL", "http://ollama:11434/api/generate")
        self.model = "phi3" 

    def generate_fix_suggestions(self, new_intent: str, existing_intent: str, similarity_score: float, raw_yaml: str) -> str:
        similarity_percent = round(similarity_score * 100, 2)
        
        # Prompt optimized for speed and clarity
        prompt = f"""
        Context: BIAT-IT AI Driver OpenAPI Governance.
        Issue: Functional Redundancy Detected ({similarity_percent}%).
        
        New API Intent: {new_intent}
        Existing API in Catalog: {existing_intent}
        
        Task:
        1. Explain the redundancy (1 sentence).
        2. Provide a short 'Fix Suggestion'.
        3. Provide a brief YAML snippet.

        Submitted YAML:
        {raw_yaml}
        
        Be extremely concise.
        """

        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "num_predict": 250, # Keeps the response short to save RAM
                "temperature": 0.2
            }
        }

        try:
            # 300 second timeout is safe for 8GB RAM
            response = requests.post(self.url, json=payload, timeout=300)
            response.raise_for_status()
            return response.json().get('response', "AI could not generate a suggestion.")
        
        except Exception as e:
            # This will show up in your 'suggestions' field if Ollama fails
            return f"Governance AI Error: {str(e)}"