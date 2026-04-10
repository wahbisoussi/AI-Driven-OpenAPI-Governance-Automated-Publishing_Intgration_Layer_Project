import requests
import urllib3
import json

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

BASE_URL = "https://localhost:9443/api/am/publisher/v4"
API_ID = "49b685e8-92aa-4706-906d-a0743c8a8bbd"
AUTH = ("admin", "admin")

def final_repair_and_publish():
    # 1. Update the API with Endpoints, Resources, AND Tiers (Business Plans)
    update_url = f"{BASE_URL}/apis/{API_ID}"
    
    payload = {
        "name": "PFETestAPI",
        "context": "/pfe-test",
        "version": "1.0.0",
        "policies": ["Unlimited"],  # <--- THIS IS THE FIX (Subscription Tiers)
        "endpointConfig": {
            "endpoint_type": "http",
            "production_endpoints": {"url": "https://httpbin.org/get"},
            "sandbox_endpoints": {"url": "https://httpbin.org/get"}
        },
        "operations": [
            {
                "target": "/*",
                "verb": "GET",
                "authType": "Any",
                "throttlingPolicy": "Unlimited"
            }
        ]
    }
    
    print("--- Step 1: Injecting Business Plans (Tiers) ---")
    r_update = requests.put(update_url, json=payload, auth=AUTH, verify=False)
    
    if r_update.status_code == 200:
        print("Success: Tiers and Resources updated!")
        
        # 2. Change Lifecycle to Published (4.6.0 exact format)
        publish_url = f"{BASE_URL}/apis/change-lifecycle"
        params = {"apiId": API_ID, "action": "Publish"}
        
        print("\n--- Step 2: Final Publishing Attempt ---")
        r_publish = requests.post(publish_url, params=params, auth=AUTH, verify=False)
        
        if r_publish.status_code in [200, 201]:
            print("🚀 MISSION ACCOMPLISHED! Your API is now PUBLISHED.")
            print("View it here: https://localhost:9443/devportal")
        else:
            print(f"Failed to publish: {r_publish.status_code}")
            print(r_publish.text)
    else:
        print(f"Failed to update: {r_update.status_code}")
        print(r_update.text)

if __name__ == "__main__":
    final_repair_and_publish()