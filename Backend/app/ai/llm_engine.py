import os
import requests

class LLMEngine:
    def __init__(self):
        self.url = os.getenv("OLLAMA_URL", "http://ollama:11434/api/generate")
        self.model = "phi3" 

    def generate_fix_suggestions(self, new_intent: str, existing_intent: str, similarity_score: float, raw_yaml: str) -> str:
        similarity_percent = round(similarity_score * 100, 2)
        
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
                "num_predict": 80,
                "temperature": 0.3,
                "num_thread": 2,
                "num_ctx": 2048
            }
        }

        try:
            print(f"🧠 Phi-3 is generating suggestions...")
            response = requests.post(self.url, json=payload, timeout=300)
            response.raise_for_status()
            return response.json().get('response', "").strip()
        except Exception as e:
            return f"Governance AI Error: {str(e)}"

    def apply_suggestion_to_yaml(self, raw_yaml: str, suggestion: str) -> str:
        prompt = f"""
        System: You are a Senior API Developer at BIAT.
        
        Task: Refactor the YAML below to implement this fix: {suggestion}
        
        Original YAML:
        {raw_yaml}
        
        Constraint: Return the FULL corrected YAML. Use a markdown code block starting with ```yaml and ending with ```.
        """
        
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "num_predict": 1000, 
                "temperature": 0.1,
                "num_thread": 2
            }
        }

        try:
            print(f"🪄 Refactoring...")
            response = requests.post(self.url, json=payload, timeout=300)
            response.raise_for_status()
            full_text = response.json().get('response', "").strip()
            
            # --- MAGIC PARSER ---
            if "```yaml" in full_text:
                return full_text.split("```yaml")[1].split("```")[0].strip()
            elif "```" in full_text:
                return full_text.split("```")[1].split("```")[0].strip()
            
            return full_text 
        except Exception as e:
            return f"Refactoring Error: {str(e)}"