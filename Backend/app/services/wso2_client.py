import requests
import urllib3
import base64
import json
import os
import time
import ssl

# --- GLOBAL SSL WARNING FIX ---
# Disable the unverified HTTPS request warnings in the logs
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

class TlsAdapter(requests.adapters.HTTPAdapter):
    def init_poolmanager(self, *args, **kwargs):
        ctx = ssl.create_default_context(ssl.Purpose.SERVER_AUTH)
        # This is the actual magic that fixes the WSO2 Illegal Parameter error
        # It lowers the strictness of the modern Python SSL library
        ctx.set_ciphers('DEFAULT@SECLEVEL=1') 
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        kwargs['ssl_context'] = ctx
        return super(TlsAdapter, self).init_poolmanager(*args, **kwargs)

class WSO2Client:
    def __init__(self):
        self.base_url = "https://api_governance_wso2:9443" 
        self.gateway_url = "https://api_governance_wso2:8243"
        self.username = "admin"
        self.password = "admin"
        
        auth_str = f"{self.username}:{self.password}"
        self.auth_header = f"Basic {base64.b64encode(auth_str.encode()).decode()}"

        # Initialize global session with our custom TLS adapter
        self.session = requests.Session()
        self.session.mount("https://", TlsAdapter())
        self.session.verify = False 

    def get_headers(self, is_json=True):
        headers = {'Authorization': self.auth_header}
        if is_json:
            headers['Accept'] = 'application/json'
        return headers

    def import_rest_api(self, yaml_file_path):
        import_url = f"{self.base_url}/api/am/publisher/v3/apis/import-openapi"
        
        metadata = {
            "name": "BIAT_Service_" + base64.b16encode(os.urandom(2)).decode(),
            "version": "1.0.0",
            "context": "/biat-test",
            "type": "HTTP"
        }

        try:
            with open(yaml_file_path, 'rb') as f:
                files = {
                    'file': (os.path.basename(yaml_file_path), f, 'application/yaml'),
                    'additionalProperties': (None, json.dumps(metadata), 'application/json')
                }
                # Use self.session.post to inherit the SSL adapter
                response = self.session.post(
                    import_url, 
                    files=files, 
                    headers={'Authorization': self.auth_header}, 
                    timeout=20
                )

            if response.status_code in [200, 201]:
                api_id = response.json().get('id')
                print(f"✅ Step 1: API Created in WSO2 (ID: {api_id})")
                return api_id
            
            print(f"❌ IMPORT FAILED: {response.status_code} - {response.text}")
            return None
        except Exception as e:
            print(f"❌ IMPORT ERROR: {e}")
            return None

    def deploy_to_prototype(self, api_id):
        url = f"{self.base_url}/api/am/publisher/v3/apis/change-lifecycle?apiId={api_id}&action=Deploy as a Prototype"
        try:
            # Use self.session
            response = self.session.post(url, headers=self.get_headers(), timeout=10)
            if response.status_code == 200:
                print(f"🧪 Step 2: API {api_id} deployed in PROTOTYPE mode.")
                return True
            return False
        except Exception as e:
            print(f"❌ PROTOTYPE ERROR: {e}")
            return False

    def run_functional_checks(self, api_id):
        print(f"🔍 Step 3: Verifying Gateway connectivity...")
        test_url = f"{self.gateway_url}/biat-test/1.0.0/health"
        time.sleep(15) 
        try:
            # Use self.session
            response = self.session.get(test_url, timeout=5)
            if response.status_code in [200, 404, 403]:
                print(f"✅ Step 3: Gateway Connectivity Verified (Status: {response.status_code})")
                return True
            return False
        except Exception as e:
            print(f"❌ Step 3: Gateway unreachable: {e}")
            return False

    def publish_api(self, api_id):
        url = f"{self.base_url}/api/am/publisher/v3/apis/change-lifecycle?apiId={api_id}&action=Publish"
        try:
            # Use self.session
            response = self.session.post(url, headers=self.get_headers(), timeout=10)
            if response.status_code == 200:
                print(f"🚀 Step 4: API {api_id} is now LIVE/PUBLISHED!")
                return True
            return False
        except Exception as e:
            print(f"❌ PUBLISH ERROR: {e}")
            return False