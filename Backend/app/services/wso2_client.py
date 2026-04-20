import requests
import os
import urllib3
from dotenv import load_dotenv

# Silence the SSL warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

load_dotenv()

def get_wso2_access_token():
    # Use the internal Docker-to-Host bridge URL
    url = "https://host.docker.internal:9443/oauth2/token"
    
    # Get keys from environment
    client_id = os.getenv("WSO2_CLIENT_ID")
    client_secret = os.getenv("WSO2_CLIENT_SECRET")

    # This is the 'curl -d' part
    # Inside get_wso2_access_token()
    data = {
        "grant_type": "client_credentials",
        "scope": "apim:api_create apim:api_manage apim:api_view"
    }
    
    try:
        # 'auth=(id, secret)' tells requests to handle the Base64 encoding for you
        # This is exactly what curl -u does!
        response = requests.post(
            url, 
            auth=(client_id, client_secret), 
            data=data, 
            verify=False
        )
        
        response.raise_for_status()
        token_data = response.json()
        return token_data.get("access_token")

    except Exception as e:
        print(f"❌ Handshake Error: {e}")
        return None

if __name__ == "__main__":
    token = get_wso2_access_token()
    if token:
        print(f"✅ SUCCESS! Token retrieved: {token}")
    else:
        print("❌ FAILED: Check WSO2 and .env")