import os
import requests

class LLMEngine:
    def __init__(self):
        # This pulls http://ollama:11434/api/generate from your docker-compose
        self.url = os.getenv("OLLAMA_URL", "http://ollama:11434/api/generate")
        self.model = "phi3" 

    def generate_fix_suggestions(self, new_intent: str, existing_intent: str, similarity_score: float, raw_yaml: str) -> str:
        similarity_percent = round(similarity_score * 100, 2)
        
        # PROMPT OPTIMIZED: We only send the semantic meaning, not the 500-line YAML.
        prompt = f"""
        System: You are an API Governance Expert at BIAT Bank.
        Context: An API is being uploaded and checked for redundancy ({similarity_percent}% similarity).
        
        New API Intent: {new_intent}
        Existing API Intent: {existing_intent}
        
        Task:
        - If similarity > 85%, explain why this is a duplicate.
        - If similarity < 85%, give ONE short architectural tip to improve the new API.
        
        Constraint: Respond in strictly under 40 words. Be professional.
        """

        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "num_predict": 80,    # Limits the output length to save CPU time
                "temperature": 0.3,   # Lower temperature = more stable/bank-standard response
                "num_thread": 2,      # Uses 2 CPU cores to avoid freezing your laptop
                "num_ctx": 2048       # Limits memory context to keep it fast
            }
        }

        try:
            # MAGIC FIX: Increased timeout to 300s to survive the "Cold Start" on 8GB RAM
            print(f"🧠 Phi-3 is thinking... (Waiting up to 300s)")
            response = requests.post(self.url, json=payload, timeout=300)
            response.raise_for_status()
            
            ai_text = response.json().get('response', "").strip()
            return ai_text if ai_text else "AI suggested checking enterprise standards for this unique service."
        
        except requests.exceptions.Timeout:
            return "Governance AI Timeout: The model is taking too long to load on this hardware."
        except Exception as e:
            return f"Governance AI Error: {str(e)}"