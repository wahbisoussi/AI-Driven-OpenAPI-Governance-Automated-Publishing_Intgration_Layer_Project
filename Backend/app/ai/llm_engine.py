import os
import requests

class LLMEngine:
    def __init__(self):
        # FIX: We check if the URL already contains the path to avoid doubling it
        raw_url = os.getenv("OLLAMA_URL", "http://ollama:11434").rstrip('/')
        
        if "/api/generate" in raw_url:
            self.url = raw_url
        else:
            self.url = f"{raw_url}/api/generate"
            
        self.model = "qwen2.5:1.5b" 

    def generate_fix_suggestions(self, new_intent: str, existing_intent: str, similarity_score: float, raw_yaml: str) -> str:
        similarity_percent = round(similarity_score * 100, 2)
        
        prompt = f"""
        [SYSTEM: STRICT API SECURITY ARCHITECT AT BIAT BANK]
        Context: An OpenAPI YAML file is being evaluated. Similarity to existing APIs: {similarity_percent}%.
        
        New API Intent: {new_intent}
        
        Task:
        1. If similarity > 85%, state clearly that this is a duplicate and must be merged.
        2. If similarity < 85%, analyze the provided YAML code below and give ONE highly specific, technical fix. 
           (Examples: missing OAuth2/JWT security, bad REST path naming conventions, missing 400/404/500 error schemas).
        
        Constraint: Be aggressive and technical. Reference the specific part of the YAML that needs fixing. Keep it under 50 words.
        
        YAML TO ANALYZE:
        ```yaml
        {raw_yaml}
        ```
        """

        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "num_predict": 150,
                "temperature": 0.2,
                "num_thread": 2,
                "num_ctx": 3072
            }
        }

        try:
            print(f"🧠 Qwen AI is analyzing the raw YAML code...")
            response = requests.post(self.url, json=payload, timeout=300)
            
            if response.status_code == 404:
                 return f"CRITICAL ERROR: Ollama returned 404. Tried URL: {self.url}. Ensure model '{self.model}' is loaded."
            
            response.raise_for_status()
            return response.json().get('response', "").strip()
        except Exception as e:
            return f"Governance AI Error: {str(e)}"

    def apply_suggestion_to_yaml(self, raw_yaml: str, suggestion: str) -> str:
        prompt = f"""
        [SYSTEM: SENIOR API ARCHITECT - BIAT BANK]
        Your mission is to REFACTOR and OPTIMIZE the provided OpenAPI YAML.
        
        MANDATORY GOAL: {suggestion}
        
        STRICT RULES:
        1. You MUST implement the goal provided above. Do not ignore it.
        2. Do NOT return the original code without changing the logic to satisfy the goal.
        "3. Return ONLY valid OpenAPI YAML. IMPORTANT: Ensure 'components' and 'security' blocks are at the ROOT level of the document, not indented inside paths."
        
        ORIGINAL YAML:
        {raw_yaml}
        
        REFACTORED YAML (Start with ```yaml):
        """
        
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "num_predict": 1500,
                "temperature": 0.4,
                "num_thread": 2,
                "num_ctx": 3072,
                "presence_penalty": 0.5
            }
        }

        try:
            print(f"🪄 AI Architect is refactoring the YAML...")
            response = requests.post(self.url, json=payload, timeout=300)
            response.raise_for_status()
            full_text = response.json().get('response', "").strip()
            
            if "```yaml" in full_text:
                return full_text.split("```yaml")[1].split("```")[0].strip()
            elif "```" in full_text:
                return full_text.split("```")[1].split("```")[0].strip()
            
            return full_text 
        except Exception as e:
            return f"Refactoring Error: {str(e)}"