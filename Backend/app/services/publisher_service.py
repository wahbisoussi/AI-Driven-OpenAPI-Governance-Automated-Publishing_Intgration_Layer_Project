import requests
import urllib3
import os
import json
from .wso2_client import get_wso2_access_token

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

WSO2_IMPORT_URL = "https://host.docker.internal:9443/api/am/publisher/v4/apis/import-openapi"

def import_api_from_yaml(file_path):
    token = get_wso2_access_token()
    if not token:
        print("❌ Could not get token.")
        return None

    headers = {"Authorization": f"Bearer {token}"}
    
    filename_no_ext = os.path.splitext(os.path.basename(file_path))[0]
    
    # --- PHASE 2 FIX: Explicit Name & Version for WSO2 ---
    additional_properties = {
        "name": filename_no_ext,
        "version": "1.0.0",
        "type": "HTTP",
        "context": f"/{filename_no_ext}", 
        "policies": ["Unlimited"]
    }

    try:
        with open(file_path, 'rb') as yaml_file:
            files = {
                'file': (os.path.basename(file_path), yaml_file, 'application/x-yaml')
            }
            data = {
                'additionalProperties': json.dumps(additional_properties)
            }

            response = requests.post(
                WSO2_IMPORT_URL,
                headers=headers,
                files=files,
                data=data,
                verify=False
            )

        if response.status_code in [200, 201]:
            api_id = response.json().get('id')
            print(f"✅ Phase 2 Success: API Imported! ID: {api_id}")
            return api_id
        else:
            print(f"❌ WSO2 Strict Error ({response.status_code}): {response.text}")
            return None
    except Exception as e:
        print(f"❌ Error during YAML import: {e}")
        return None