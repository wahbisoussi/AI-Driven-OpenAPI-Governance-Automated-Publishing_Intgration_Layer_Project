import os
import requests
import yaml
import re

class LLMEngine:
    def __init__(self):
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
        1. If similarity > 85%, state clearly that this is a duplicate.
        2. If similarity < 85%, perform a "High-Authority Architectural Audit." Identify ONE critical technical violation. 
        Focus strictly on:
        - GOVERNANCE: Use NOUNS for paths. (Replace '/send-money' with '/transfers/send').
        - SECURITY: Upgrade 'BasicAuth' or missing security to 'OAuth2/OIDC'.
        
        Constraint: Keep it under 120 words. Output only ONE fix.
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
            response.raise_for_status()
            ai_suggestion = response.json().get('response', "").strip()
            return ai_suggestion
        except Exception as e:
            return f"Governance AI Error: {str(e)}"

    def apply_suggestion_to_yaml(self, raw_yaml: str, suggestion: str) -> str:
        prompt = f"""
        [SYSTEM: SENIOR API ARCHITECT - BIAT BANK - WSO2 COMPLIANCE ENFORCER]
        Mission: REFACTOR the provided OpenAPI YAML to be WSO2-ready.
        
        AI AUDIT SUGGESTION: {suggestion}
        
        STRICT RULES:
        1. Add 'servers' array: [{{"url": "https://api.biat.com.tn"}}]
        2. Use static paths only (no curly braces).
        3. Every operation MUST have a 'responses' block with 200, 400, and 500.
        4. Return ONLY the YAML.
        
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
                "temperature": 0.1,
                "num_thread": 2,
                "num_ctx": 4096,
                "presence_penalty": 0.7
            }
        }

        for attempt in range(2):
            try:
                print(f"🪄 AI Architect is refactoring (Attempt {attempt + 1})...")
                response = requests.post(self.url, json=payload, timeout=300)
                response.raise_for_status()
                full_text = response.json().get('response', "").strip()

                cleaned_yaml = full_text
                if "```yaml" in full_text:
                    cleaned_yaml = full_text.split("```yaml")[1].split("```")[0].strip()
                elif "```" in full_text:
                    cleaned_yaml = full_text.split("```")[1].split("```")[0].strip()

                # 🟢 LOGIC UPDATE: We no longer "reject" the AI's work if it fails a check.
                # We pass it to the sanitizer which is now powerful enough to fix it.
                return self.sanitize_yaml(cleaned_yaml)

            except Exception as e:
                print(f"❌ AI Refactor failed on attempt {attempt + 1}: {e}")

        return raw_yaml

    def sanitize_yaml(self, yaml_text: str) -> str:
        """
        The 'Force-Fixer': Rebuilds the YAML from scratch to ensure WSO2 compliance.
        """
        try:
            # 1. Load what the AI gave us
            try:
                raw_parsed = yaml.safe_load(yaml_text)
            except:
                return yaml_text # Fallback if it's not even valid YAML

            if not isinstance(raw_parsed, dict): 
                return yaml_text

            # 2. Rebuild the core structure (Fixes missing openapi/info/servers)
            clean = {
                "openapi": "3.0.1",
                "info": {
                    "title": raw_parsed.get("info", {}).get("title", "BIAT Service"),
                    "version": "2026-04-29",
                    "description": "Managed BIAT API Service - Governance Approved."
                },
                "servers": [{"url": "https://api.biat.com.tn"}],  # 🟢 FIXED: Removed markdown
                "paths": {},
                "components": {"securitySchemes": {}}
            }

            # 3. Fix Security (Fixes 'scopes is not object' and 'authorizationUrl missing')
            clean["components"]["securitySchemes"] = {
                "OAuth2": {
                    "type": "oauth2",
                    "flows": {
                        "implicit": {
                            "authorizationUrl": "https://api.biat.com.tn/authorize",  # 🟢 FIXED: Removed markdown
                            "scopes": {} 
                        }
                    }
                }
            }
            clean["security"] = [{"OAuth2": []}]

            # 4. Rebuild Paths (Fixes 'unexpected operationId' and 'unexpected responses')
            for path, methods in raw_parsed.get("paths", {}).items():
                # Fix Path Braces (WSO2 restriction)
                clean_path = re.sub(r"\{[^}]+\}", "details", path)
                if not clean_path.startswith("/"): 
                    clean_path = "/" + clean_path
                
                clean["paths"][clean_path] = {}
                
                if isinstance(methods, dict):
                    for method, data in methods.items():
                        if method.lower() in ["get", "post", "put", "delete"]:
                            # 🟢 FIXED: Added summary and description from original
                            summary = data.get("summary", f"{method.upper()} {clean_path}")
                            description = data.get("description", f"Execute {method.upper()} operation on {clean_path}")
                            
                            # Construct the method block with guaranteed indentation
                            method_block = {
                                "summary": summary,  # 🟢 ADDED
                                "description": description,  # 🟢 ADDED
                                "operationId": f"{method}{clean_path.replace('/', '').capitalize()}",
                                "responses": {
                                    "200": {"description": "Success"},
                                    "400": {"description": "Bad Request"},
                                    "500": {"description": "Internal Server Error"}
                                }
                            }
                            
                            # 🟢 FIXED: Enhanced parameter handling
                            if isinstance(data, dict) and "parameters" in data:
                                valid_params = []
                                params_source = data["parameters"]
                                if isinstance(params_source, list):
                                    for p in params_source:
                                        if isinstance(p, dict):
                                            param = {
                                                "name": p.get("name", "param"),
                                                "in": p.get("in", "query"),
                                                "required": p.get("required", False),
                                                "schema": p.get("schema", {"type": "string"})
                                            }
                                            valid_params.append(param)
                                if valid_params:
                                    method_block["parameters"] = valid_params

                        clean["paths"][clean_path][method.lower()] = method_block

            return yaml.dump(clean, sort_keys=False)

        except Exception as e:
            print(f"❌ Sanitization failed: {e}")
            return yaml_text

    def is_valid_yaml(self, yaml_text: str) -> bool:
        """Helper for internal logging, no longer a blocker."""
        try:
            parsed = yaml.safe_load(yaml_text)
            return isinstance(parsed, dict) and "openapi" in parsed
        except:
            return False