import requests
import urllib3
import os
import json
import time
from app.services.wso2_client import get_wso2_access_token

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
PUBLISHER_BASE_URL = "https://host.docker.internal:9443/api/am/publisher/v4/apis"

def delete_existing_api_by_name(api_name, headers):
    """Searches and deletes an existing API to prevent 409 Conflicts."""
    try:
        search_url = f"{PUBLISHER_BASE_URL}?query=name:{api_name}"
        res = requests.get(search_url, headers=headers, verify=False, timeout=10)
        if res.status_code == 200:
            api_list = res.json().get('list', [])
            for api in api_list:
                if api['name'].lower() == api_name.lower():
                    print(f"🧹 Cleanup: Deleting old API version (ID: {api['id']})...")
                    requests.delete(f"{PUBLISHER_BASE_URL}/{api['id']}", headers=headers, verify=False)
                    time.sleep(4) 
                    return True
        return False
    except Exception as e:
        print(f"⚠️ Cleanup Warning: {e}")
        return False

def attach_business_plan(api_id, headers):
    """Attach business plan to make it green in WSO2 UI"""
    try:
        # Get available business plans
        plans_url = f"{PUBLISHER_BASE_URL[:-4]}/business-plans"  # Remove "/apis" from base URL
        plans_res = requests.get(plans_url, headers=headers, verify=False)
        
        print(f"🔍 Checking business plans response: {plans_res.status_code}")
        
        if plans_res.status_code == 200:
            plans = plans_res.json().get('list', [])
            print(f"📋 Found {len(plans)} business plans available")
            
            if plans:
                # Use first available plan (typically "Unlimited")
                plan_name = plans[0]['name']
                print(f"🎯 Attaching business plan: {plan_name}")
                
                attach_url = f"{PUBLISHER_BASE_URL[:-4]}/{api_id}/business-plans"
                attach_res = requests.post(
                    attach_url, 
                    headers=headers, 
                    json={"planName": plan_name}, 
                    verify=False
                )
                
                print(f"📤 Business plan attachment response: {attach_res.status_code}")
                
                if attach_res.status_code in [200, 201]:
                    print(f"✅ Business Plan '{plan_name}' attached successfully")
                    return True
                else:
                    print(f"❌ Business Plan attachment failed: {attach_res.text}")
        else:
            print(f"❌ Failed to get business plans: {plans_res.text}")
            
        return False
    except Exception as e:
        print(f"⚠️ Business Plan attachment exception: {e}")
        return False

def check_deployment_status(api_id):
    """
    Check if API is deployed to gateways.
    Returns: (bool, status_info)
    """
    try:
        token = get_wso2_access_token()
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get API details including deployment status
        api_url = f"{PUBLISHER_BASE_URL}/{api_id}"
        res = requests.get(api_url, headers=headers, verify=False)
        
        if res.status_code == 200:
            api_data = res.json()
            lifecycle_status = api_data.get("lifeCycleStatus", "")
            
            # Check if API is deployed (has gateway environments)
            deployments_url = f"{PUBLISHER_BASE_URL}/{api_id}/deployments"
            dep_res = requests.get(deployments_url, headers=headers, verify=False)
            
            if dep_res.status_code == 200:
                deployments = dep_res.json().get("list", [])
                deployed_gateways = []
                
                for deployment in deployments:
                    deployed_gateways.extend(deployment.get("deployedGateways", []))
                
                is_deployed = len(deployed_gateways) > 0
                
                print(f"🔍 Deployment Status: {lifecycle_status}")
                print(f"🌐 Deployed Gateways: {deployed_gateways}")
                
                return is_deployed, {
                    "lifecycle_status": lifecycle_status,
                    "deployed_gateways": deployed_gateways,
                    "is_deployed": is_deployed
                }
            else:
                return False, {"error": "Failed to get deployment info"}
        else:
            return False, {"error": "Failed to get API info"}
            
    except Exception as e:
        return False, {"error": f"Deployment check failed: {str(e)}"}

def continue_publishing(api_id):
    """
    Continue with publishing after manual deployment is verified.
    Returns: (bool, message)
    """
    try:
        token = get_wso2_access_token()
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

        print("🟢 PUBLISH: Changing Lifecycle to Published...")
        
        pub_res = requests.post(
            f"{PUBLISHER_BASE_URL}/{api_id}/change-lifecycle", 
            headers=headers, 
            params={"action": "Publish"}, 
            verify=False
        )
        
        if pub_res.status_code == 200:
            print(f"🏆 Publishing Success for API {api_id}")
            return True, "API successfully published."
        else:
            return False, f"PUBLISH failed: {pub_res.text}"
            
    except Exception as e:
        return False, f"Publishing exception: {str(e)}"

def import_api_from_yaml(file_path):
    """CREATE STEP: Imports YAML into WSO2."""
    token = get_wso2_access_token()
    if not token: return None
    headers = {"Authorization": f"Bearer {token}"}
    filename = os.path.splitext(os.path.basename(file_path))[0]

    delete_existing_api_by_name(filename, headers)

    additional_properties = {
        "name": filename,
        "version": "1.0.0",
        "context": f"/{filename}",
        "visibility": "PUBLIC",
        "policies": ["Unlimited"], # 🟢 ADD THIS LINE: It fixes the gray "X"
        "endpointConfig": {
            "endpoint_type": "http",
            "production_endpoints": {"url": "https://httpbin.org/get"},
            "sandbox_endpoints": {"url": "https://httpbin.org/get"}
        }
    }

    try:
        with open(file_path, "rb") as f:
            files = {"file": (os.path.basename(file_path), f, "application/x-yaml")}
            data = {"additionalProperties": json.dumps(additional_properties)}
            res = requests.post(f"{PUBLISHER_BASE_URL}/import-openapi", headers=headers, files=files, data=data, verify=False, timeout=30)

        if res.status_code in [200, 201]:
            print(f"✅ CREATE: API {filename} imported successfully.")
            api_id = res.json().get("id")
            
            # Immediately run the full lifecycle
            success, message = publish_api_full_lifecycle(api_id)
            if success:
                return api_id
            else:
                print(f"⚠️ Lifecycle issue: {message}")
                return api_id  # Still return ID for manual retry
        
        print(f"❌ CREATE FAILED: {res.text}")
        return None
    except Exception as e:
        print(f"❌ Import Exception: {e}"); return None

def publish_api_full_lifecycle(api_id):
    """
    Handles BUSINESS_PLAN -> CREATE REVISION -> WAIT FOR MANUAL DEPLOY -> PUBLISH sequence.
    Returns: (bool, message)
    """
    try:
        token = get_wso2_access_token()
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

        # --- STEP 1: Attach Business Plan ---
        print("📋 [1/4] Attaching Business Plan...")
        if not attach_business_plan(api_id, headers):
            print("⚠️ Business Plan attachment failed, continuing...")

        # --- STEP 2: CREATE REVISION ---
        print(f"📦 [2/4] Creating Revision for {api_id}...")
        rev_res = requests.post(
            f"{PUBLISHER_BASE_URL}/{api_id}/revisions", 
            headers=headers, 
            json={"description": "Gov-Automated-Revision"}, 
            verify=False
        )
        
        if rev_res.status_code != 201:
            return False, f"REVISION failed: {rev_res.text}"

        revision_id = rev_res.json().get("id")
        print(f"✅ Revision Created: {revision_id}")

        # --- STEP 3: WAIT FOR MANUAL DEPLOYMENT (Integrated) ---
        print(f"⏳ [3/4] WAITING: Please manually deploy revision {revision_id} in WSO2 UI...")
        print("📌 Go to: https://localhost:9443/publisher/apis")
        print("📌 Click: Deployments -> Deploy New Revision -> Select 'all' -> Deploy")
        
        # Check deployment status periodically with realistic timing
        max_wait_time = 300  # 5 minutes max wait
        check_interval = 15   # Check every 15 seconds (realistic)
        elapsed_time = 0
        
        while elapsed_time < max_wait_time:
            is_deployed, status_info = check_deployment_status(api_id)
            
            if is_deployed:
                print(f"✅ [3/4] DEPLOYMENT DETECTED: {status_info['deployed_gateways']}")
                break
            else:
                print(f"⏳ Waiting for deployment... ({elapsed_time}s elapsed, checking every 15s)")
                time.sleep(check_interval)
                elapsed_time += check_interval
        
        if not is_deployed:
            return False, "Manual deployment not detected within 5 minutes"

        # --- STEP 4: AUTO PUBLISH ---
        print("🟢 [4/4] PUBLISH: Auto-publishing now...")
        success, message = continue_publishing(api_id)
        
        if success:
            print(f"🏆 End-to-End Success for API {api_id}")
            return True, "API created, deployed manually, and published automatically."
        else:
            return False, f"Publishing failed: {message}"

    except Exception as e:
        return False, f"System Failure: {str(e)}"