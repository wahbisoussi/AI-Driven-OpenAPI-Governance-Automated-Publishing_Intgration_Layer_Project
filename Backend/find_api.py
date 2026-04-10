import requests
import urllib3
urllib3.disable_warnings()

# Use the token you got from your other script
token = "PASTE_YOUR_LATEST_TOKEN_HERE" 
base_url = "https://localhost:9443"

# Common WSO2 Publisher paths
paths = [
    "/api/am/publisher/v4/apis/import-openapi",
    "/api/am/publisher/v3/apis/import-openapi",
    "/api/am/publisher/v2/apis/import-openapi",
    "/api/am/publisher/v1/apis/import-openapi",
    "/api/am/publisher/v1.0/apis/import-openapi",
    "/api/am/publisher/v3/import/openapi",
]

print("🔍 Scanning for the correct WSO2 endpoint...")
for path in paths:
    url = f"{base_url}{path}"
    # We use 'OPTIONS' just to see if the URL exists without uploading anything
    response = requests.options(url, verify=False)
    print(f"Path: {path} --> Status: {response.status_code}")

    if response.status_code != 404:
        print(f"🌟 FOUND IT! Use this path: {path}")