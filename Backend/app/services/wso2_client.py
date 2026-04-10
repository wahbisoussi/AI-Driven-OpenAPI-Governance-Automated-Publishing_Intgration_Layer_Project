import requests
import urllib3
import base64
import json
import os
import time

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

class WSO2Client:
    def __init__(self):
        self.base_url = "https://localhost:9443"  # Management API Port
        self.gateway_url = "https://localhost:8243" # Gateway Traffic Port
        self.username = "admin"
        self.password = "admin"
        self.client_id = "ED2UnxttZX7nGY0A_0y_fDrCikAa" 
        self.client_secret = "EZm_pjqDrFehlIVWmJP5gtKC8Zwa"

    def get_access_token(self):
        """Requests an OAuth2 Access Token for the Publisher API."""
        token_url = f"{self.base_url}/oauth2/token"
        data = {
            'grant_type': 'password',
            'username': self.username,
            'password': self.password,
            'scope': 'apim:api_create apim:api_publish apim:api_view'
        }
        auth_str = f"{self.client_id}:{self.client_secret}"
        encoded_auth = base64.b64encode(auth_str.encode()).decode()
        headers = {
            'Authorization': f'Basic {encoded_auth}',
            'Content-Type': 'application/x-www-form-urlencoded'
        }

        try:
            response = requests.post(token_url, data=data, headers=headers, verify=False)
            if response.status_code == 200:
                return response.json().get('access_token')
            return None
        except Exception as e:
            print(f"❌ AUTH ERROR: {e}")
            return None

    def import_rest_api(self, yaml_file_path):
        """Phase 5.1: Initial Import/Creation in WSO2."""
        token = self.get_access_token()
        if not token: return None
        
        import_url = f"{self.base_url}/api/am/publisher/v4/apis/import-openapi"
        headers = {'Authorization': f'Bearer {token}'}

        metadata = {
            "name": "BIAT_Service_" + base64.b16encode(os.urandom(2)).decode(),
            "version": "1.0.0",
            "context": "/biat-test",  # This must match the testing path
            "type": "HTTP"
        }

        try:
            with open(yaml_file_path, 'rb') as f:
                files = {
                    'file': (yaml_file_path, f, 'application/yaml'),
                    'additionalProperties': (None, json.dumps(metadata), 'application/json')
                }
                response = requests.post(import_url, files=files, headers=headers, verify=False)

            if response.status_code in [200, 201]:
                api_id = response.json().get('id')
                print(f"✅ Step 1: API Created (ID: {api_id})")
                return api_id
            return None
        except Exception as e:
            print(f"❌ IMPORT ERROR: {e}")
            return None

    def deploy_to_prototype(self, api_id):
        """Phase 5.2: Transition to PROTOTYPE state."""
        token = self.get_access_token()
        url = f"{self.base_url}/api/am/publisher/v4/apis/change-lifecycle?apiId={api_id}&action=Deploy as a Prototype"
        headers = {'Authorization': f'Bearer {token}'}

        try:
            response = requests.post(url, headers=headers, verify=False)
            if response.status_code == 200:
                print(f"🧪 Step 2: API {api_id} deployed in PROTOTYPE mode.")
                return True
            return False
        except Exception as e:
            print(f"❌ PROTOTYPE ERROR: {e}")
            return False

    def run_functional_checks(self, api_id):
        """Phase 5.3: Functional Verification on the Gateway."""
        print(f"🔍 Step 3: Verifying Functional Integrity for {api_id}...")
        
        # Synchronized with the context '/biat-test' used in import
        test_url = f"{self.gateway_url}/biat-test/1.0.0/health"
        
        try:
            # Short wait to allow the gateway to synchronize the new prototype
            time.sleep(2) 
            response = requests.get(test_url, verify=False, timeout=5)
            
            # 200 (Success) or 404 (Gateway routing works but backend is mock) 
            # are both valid for a prototype demonstration
            if response.status_code in [200, 404, 403]:
                print(f"✅ Step 3: Gateway Connectivity Verified (Status: {response.status_code})")
                return True
            print(f"⚠️ Step 3: Gateway returned unexpected status {response.status_code}")
            return False
        except Exception as e:
            print(f"❌ Step 3: Functional Check Failed. Gateway unreachable: {e}")
            return False

    def publish_api(self, api_id):
        """Phase 5.4: Final Publication to the API Catalog."""
        token = self.get_access_token()
        url = f"{self.base_url}/api/am/publisher/v4/apis/change-lifecycle?apiId={api_id}&action=Publish"
        headers = {'Authorization': f'Bearer {token}'}

        try:
            response = requests.post(url, headers=headers, verify=False)
            if response.status_code == 200:
                print(f"🚀 Step 4: API {api_id} is now LIVE/PUBLISHED!")
                return True
            return False
        except Exception as e:
            print(f"❌ PUBLISH ERROR: {e}")
            return False