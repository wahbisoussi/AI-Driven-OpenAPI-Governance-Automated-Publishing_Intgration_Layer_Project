import requests
import urllib3
import base64
import json

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

class WSO2Client:
    def __init__(self):
        self.base_url = "https://localhost:9443"
        self.username = "admin"
        self.password = "admin"
        # Using the keys from your screenshot
        self.client_id = "ED2UnxttZX7nGY0A_0y_fDrCikAa" 
        self.client_secret = "EZm_pjqDrFehlIVWmJP5gtKC8Zwa"

    def get_access_token(self):
        """Requests an OAuth2 Access Token."""
        print("🔐 Requesting Access Token...")
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
                token = response.json().get('access_token')
                print(f"✅ TOKEN ACQUIRED: {token[:10]}...") 
                return token
            else:
                print(f"❌ LOGIN FAILED: {response.status_code}")
                return None
        except Exception as e:
            print(f"❌ ERROR: {e}")
            return None

    def import_rest_api(self, yaml_file_path):
        """Uploads an OpenAPI YAML file to WSO2 v4 with explicit naming."""
        token = self.get_access_token()
        if not token:
            return
        
        import_url = f"{self.base_url}/api/am/publisher/v4/apis/import-openapi"
        print(f"📤 Importing API to WSO2 v4...")
        
        headers = {'Authorization': f'Bearer {token}'}

        # metadata ensures we stay under the 60-character limit
        metadata = {
            "name": "PFETestAPI",
            "version": "1.0.0",
            "context": "/pfe-test",
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
                print(f"✅ SUCCESS: API Created in WSO2!")
                print(f"🆔 API ID: {api_id}")
                return api_id
            else:
                print(f"❌ IMPORT FAILED: {response.status_code}")
                print(f"Detail: {response.text}")
        except Exception as e:
            print(f"❌ ERROR: {e}")

if __name__ == "__main__":
    client = WSO2Client()
    # Make sure test_api.yaml is in your backend folder
    client.import_rest_api("test_api.yaml")