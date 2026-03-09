import requests
import json

class LLMEngine:
    def __init__(self):
        # Default local URL for Ollama's API
        self.url = "http://localhost:11434/api/generate"
        self.model = "llama3"

    def generate_fix_suggestions(self, new_intent: str, existing_intent: str, similarity_score: float) -> str:
        """
        Calls Ollama (Llama 3) to generate professional architectural advice 
        when a functional overlap is detected.
        """
        similarity_percent = round(similarity_score * 100, 2)
        
        # Professional prompt engineered for API Governance
        prompt = f"""
        Context: BIAT-IT API Governance System.
        Issue: Functional Redundancy Detected ({similarity_percent}% similarity).
        
        New API Intent: {new_intent}
        Existing API in Catalog: {existing_intent}
        
        Task:
        1. Explain why these APIs are considered redundant.
        2. Provide a 'Fix Suggestion' for the developer (e.g., merge endpoints, use existing service).
        3. Keep the tone professional and concise for a technical report.
        """

        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False
        }

        try:
            # Added 120s timeout to handle initial model loading (cold-start)
            response = requests.post(self.url, json=payload, timeout=120)
            response.raise_for_status()
            
            # Extract the response text from Ollama's JSON
            return response.json().get('response', "AI could not generate a suggestion at this time.")
        except Exception as e:
            return f"Governance AI Error: {str(e)}"