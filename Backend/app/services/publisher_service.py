import requests
import urllib3
import os
from .wso2_client import get_wso2_access_token

# Silence SSL warnings for local dev
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

#WSO2_PUBLISHER_URL = "https://host.docker.internal:9443/api/am/publisher/v1/apis"
WSO2_PUBLISHER_URL = "https://host.docker.internal:9443/api/am/publisher/v4/apis"

def create_api_shell(name, version, context):
    """
    Creates a basic API 'shell' in WSO2 Publisher.
    """
    token = get_wso2_access_token()
    if not token:
        print("❌ Could not get token. Aborting.")
        return None

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # This is the minimal body WSO2 requires to register an API
    payload = {
        "name": name,
        "version": version,
        "context": context, # This is the URL path (e.g., /myapi)
        "endpointConfig": {
            "endpoint_type": "http",
            "production_endpoints": {
                "url": "https://api.mockbin.io/" # A dummy backend for testing
            }
        },
        "policies": ["Unlimited"] # Default subscription tier
    }

    try:
        response = requests.post(
            WSO2_PUBLISHER_URL, 
            json=payload, 
            headers=headers, 
            verify=False
        )
        
        if response.status_code == 201:
            api_data = response.json()
            print(f"✅ API Created Successfully! ID: {api_data.get('id')}")
            return api_data.get('id')
        else:
            print(f"❌ Failed to create API: {response.status_code}")
            print(response.json())
            return None

    except Exception as e:
        print(f"❌ Error during API creation: {e}")
        return None

if __name__ == "__main__":
    # Test creating a 'PFE_Test_API'
    create_api_shell("PFE_Test_API", "1.0.0", "/pfe_test")