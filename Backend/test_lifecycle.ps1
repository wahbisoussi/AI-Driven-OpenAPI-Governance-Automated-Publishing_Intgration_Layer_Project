Add-Type @"
using System.Net;
using System.Security.Cryptography.X509Certificates;
public class TrustAll : ICertificatePolicy {
    public bool CheckValidationResult(ServicePoint sp, X509Certificate cert, WebRequest req, int problem) { return true; }
}
"@
[System.Net.ServicePointManager]::CertificatePolicy = New-Object TrustAll

$clientId = "9NM3RiuUjzyNu7IMmufPDqbdAmEa"
$clientSecret = "DR2Icc26QNnVgolFsUCRyX5dKkca"
$b64 = [Convert]::ToBase64String([System.Text.Encoding]::ASCII.GetBytes("${clientId}:${clientSecret}"))

Write-Host "=== Getting token..."
$tokenResp = Invoke-WebRequest -Method POST `
    -Uri "https://localhost:9443/oauth2/token" `
    -Headers @{"Authorization" = "Basic $b64"} `
    -ContentType "application/x-www-form-urlencoded" `
    -Body "grant_type=client_credentials&scope=apim:api_publish apim:api_view apim:api_create apim:api_manage"

$tokenObj = $tokenResp.Content | ConvertFrom-Json
Write-Host "Token scope: $($tokenObj.scope)"
$token = $tokenObj.access_token

Write-Host "=== Listing all APIs in WSO2..."
$listResp = Invoke-WebRequest -Method GET `
    -Uri "https://localhost:9443/api/am/publisher/v4/apis" `
    -Headers @{"Authorization" = "Bearer $token"}
$apis = ($listResp.Content | ConvertFrom-Json).list
Write-Host "Found $($apis.Count) APIs:"
foreach ($api in $apis) {
    Write-Host "  ID=$($api.id)  Name=$($api.name)  State=$($api.lifeCycleStatus)"
}

if ($apis.Count -eq 0) {
    Write-Host "NO APIs found in WSO2 — nothing to publish"
    exit
}

$apiId = $apis[0].id
$apiState = $apis[0].lifeCycleStatus
Write-Host ""
Write-Host "=== API: $apiId (state: $apiState)"

$authHeader = @{"Authorization" = "Bearer $token"}
$baseUrl = "https://localhost:9443/api/am/publisher/v4/apis/" + $apiId + "/change-lifecycle"
$url = $baseUrl + "?action=Publish"
Write-Host "Target URL: $url"

foreach ($method in @("POST", "GET", "PUT", "PATCH")) {
    Write-Host ""
    Write-Host "--- $method ---"
    try {
        $r = Invoke-WebRequest -Method $method -Uri $url -Headers $authHeader -ErrorAction Stop
        Write-Host "  SUCCESS $($r.StatusCode): $($r.Content)"
    } catch {
        $resp = $_.Exception.Response
        if ($resp -ne $null) {
            $code = [int]$resp.StatusCode
            Write-Host "  $code"
            if ($code -eq 405) {
                Write-Host "  Allow: $($resp.Headers['Allow'])"
            }
            try {
                $stream = $resp.GetResponseStream()
                $reader = New-Object System.IO.StreamReader($stream)
                $respBody = $reader.ReadToEnd()
                Write-Host "  Body: $respBody"
            } catch {}
        } else {
            Write-Host "  Exception: $($_.Exception.Message)"
        }
    }
}
