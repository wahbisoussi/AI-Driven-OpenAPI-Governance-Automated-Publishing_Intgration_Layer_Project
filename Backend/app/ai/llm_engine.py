import os
import requests

class LLMEngine:
    def __init__(self):
        self.url = os.getenv("OLLAMA_URL", "http://ollama:11434/api/generate")
        # 1. UPGRADE: Switched to the specialized coder model that fits in 8GB RAM
        self.model = "qwen2.5-coder:1.5b" 

    def generate_fix_suggestions(self, new_intent: str, existing_intent: str, similarity_score: float, raw_yaml: str) -> str:
        similarity_percent = round(similarity_score * 100, 2)
        
        # 2. UPGRADE: Formatted the prompt to be sharper for Qwen
        prompt = f"""
        [SYSTEM: API Governance Expert at BIAT Bank]
        Context: An API is being uploaded. Similarity to existing APIs: {similarity_percent}%.
        
        New API Intent: {new_intent}
        Existing API Intent: {existing_intent}
        
        Task:
        - If similarity > 85%, explain why this is a duplicate.
        - If similarity < 85%, give ONE technical architectural tip (e.g., Security, Validation) to improve the new API.
        
        Constraint: Respond in strictly under 40 words. Be professional.
        """

        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "num_predict": 100,
                "temperature": 0.3,
                "num_thread": 2,
                "num_ctx": 2048
            }
        }

        try:
            print(f"🧠 Qwen AI is analyzing API intents...")
            response = requests.post(self.url, json=payload, timeout=300)
            response.raise_for_status()
            return response.json().get('response', "").strip()
        except Exception as e:
            return f"Governance AI Error: {str(e)}"

    def apply_suggestion_to_yaml(self, raw_yaml: str, suggestion: str) -> str:
        # 3. UPGRADE: The "Aggressive Architect" Prompt. No more lazy copy-pasting.
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
        
        # 4. UPGRADE: The "Brain" settings
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "num_predict": 1500,       # Increased so it doesn't cut off long YAML files
                "temperature": 0.4,        # Raised from 0.1 so the AI takes action and changes things
                "num_thread": 2,
                "num_ctx": 3072,           # Gives the AI a larger "RAM workspace"
                "presence_penalty": 0.5    # Secret weapon: Penalizes the AI if it just repeats the input
            }
        }

        try:
            print(f"🪄 AI Architect is refactoring the YAML...")
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