import requests
import os
import urllib3
from dotenv import load_dotenv

# Silence the SSL warnings for the WSO2 self-signed cert
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

load_dotenv()

def get_wso2_access_token():
    """
    Retrieves the OAuth2 token from WSO2 using Client Credentials.
    """
    url = "https://host.docker.internal:9443/oauth2/token"
    
    client_id = os.getenv("WSO2_CLIENT_ID")
    client_secret = os.getenv("WSO2_CLIENT_SECRET")

    if not client_id or not client_secret:
        print("❌ ERROR: WSO2_CLIENT_ID or SECRET missing in .env")
        return None

    # CRITICAL FIX: Joined with spaces properly
    scopes = [
        "apim:api_create",
        "apim:api_manage",
        "apim:api_view",
        "apim:api_publish",
        "apim:api_import_export"
    ]
    
    data = {
        "grant_type": "client_credentials",
        "scope": " ".join(scopes)  # Ensures perfect spacing
    }
    
    try:
        # auth=(id, secret) handles the Base64 'Authorization: Basic' header
        response = requests.post(
            url, 
            auth=(client_id, client_secret), 
            data=data, 
            verify=False,
            timeout=10
        )
        
        if response.status_code != 200:
            print(f"❌ Token Request Failed: {response.status_code}")
            print(f"Response: {response.text}")
            return None

        token_data = response.json()
        return token_data.get("access_token")

    except Exception as e:
        print(f"❌ WSO2 Handshake Error: {e}")
        return None