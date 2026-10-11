<# 
.SYNOPSIS
Deploy Edge Function ai-proxy to Supabase
.DESCRIPTION
Deploy the ai-proxy function using Supabase Management API
.PREREQUISITES
- SUPABASE_ACCESS_TOKEN environment variable set
- Project ref: ueyuyyachmdjnbiteybp
#>

param(
    [string]$AccessToken = $env:SUPABASE_ACCESS_TOKEN,
    [string]$ProjectRef = "ueyuyyachmdjnbiteybp",
    [string]$FunctionName = "ai-proxy",
    [string]$FunctionSlug = "ai-proxy",
    [bool]$TestAfterDeploy = $true
)

function Write-Success { param($msg) Write-Host $msg -ForegroundColor Green }
function Write-Error { param($msg) Write-Host $msg -ForegroundColor Red }
function Write-Info { param($msg) Write-Host $msg -ForegroundColor Yellow }
function Write-Warning { param($msg) Write-Host $msg -ForegroundColor Cyan }

# 1) Check token
if (-not $AccessToken) {
    Write-Warning "SUPABASE_ACCESS_TOKEN environment variable is not set."
    $token = Read-Host "Please enter your Personal Access Token (from https://supabase.com/dashboard/account/tokens)"
    if (-not $token) {
        Write-Error "No token entered. Script stopped."
        exit 1
    }
    $AccessToken = $token
    $env:SUPABASE_ACCESS_TOKEN = $AccessToken
}

Write-Info "Token configured OK"

# 2) Read function file (raw TypeScript)
$functionPath = "supabase/functions/ai-proxy/index.ts"
if (-not (Test-Path $functionPath)) {
    Write-Error "File $functionPath not found. Run from project root."
    exit 1
}

$content = Get-Content $functionPath -Raw
Write-Info "Function file read ($($content.Length) chars)"

$apiBase = "https://api.supabase.com/v1/projects/$ProjectRef"

# 3) Check if function exists
Write-Info "Checking if function exists in Supabase..."
try {
    $response = curl.exe -s -X GET "$apiBase/functions" -H "Authorization: Bearer $AccessToken" -H "Content-Type: application/json"
    $functions = $response | ConvertFrom-Json
    
    $existingFunction = $functions | Where-Object { $_.slug -eq $FunctionSlug }
    
    if ($existingFunction) {
        Write-Info "Function '$FunctionSlug' exists. Updating..."
        $method = "PATCH"
        $url = "$apiBase/functions/$FunctionSlug"
    } else {
        Write-Info "Function '$FunctionSlug' not found. Creating..."
        $method = "POST"
        $url = "$apiBase/functions"
    }
} catch {
    Write-Error "Error checking function: $_"
    exit 1
}

# Request body - raw TypeScript code in body field
$bodyObj = @{
    slug        = $FunctionSlug
    name        = $FunctionName
    verify_jwt  = $false
    body        = $content
}
$body = $bodyObj | ConvertTo-Json -Depth 10 -Compress

# Write to temp file with UTF-8 NO BOM
$tempBodyFile = [IO.Path]::GetTempFileName()
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[IO.File]::WriteAllText($tempBodyFile, $body, $utf8NoBom)

# Debug: print request body (truncated)
Write-Info "Request body prepared (length: $($body.Length) chars)"

# Deploy/Update
Write-Info "Deploying function..."
try {
    $deployResponse = curl.exe -s -X $method "$url" `
        -H "Authorization: Bearer $AccessToken" `
        -H "Content-Type: application/json" `
        -d "@$tempBodyFile"
    
    $result = $deployResponse | ConvertFrom-Json
    
    if ($result.id -or $result.slug) {
        Write-Success "Function deployed successfully!"
        Write-Info "Slug: $($result.slug)"
        Write-Info "Version: $($result.version)"
    } else {
        Write-Error "Deploy failed:"
        $deployResponse | ConvertTo-Json | Write-Host
        exit 1
    }
} catch {
    Write-Error "Deploy error: $_"
    $deployResponse | Write-Host
    exit 1
} finally {
    if (Test-Path $tempBodyFile) { Remove-Item $tempBodyFile -Force }
}

# 5) Test Function
if ($TestAfterDeploy) {
    Write-Info "Waiting 5 seconds for function to be ready..."
    Start-Sleep -Seconds 5
    
    Write-Info "Testing function..."
    $testBodyObj = @{
        task     = "quiz"
        text     = "This is a test text for AI verification"
        count    = 2
        types    = @("mc")
        deviceId = "test-device-12345678"
    }
    $testBody = $testBodyObj | ConvertTo-Json -Depth 10 -Compress

    # Write test body to temp file (UTF-8 no BOM)
    $tempTestBodyFile = [IO.Path]::GetTempFileName()
    [IO.File]::WriteAllText($tempTestBodyFile, $testBody, $utf8NoBom)
    
    Write-Info "First request (should succeed)..."
    $test1 = curl.exe -s -X POST "https://$ProjectRef.supabase.co/functions/v1/ai-proxy" `
        -H "Content-Type: application/json" `
        -d "@$tempTestBodyFile"
    
    Write-Host "First response:"
    $test1 | ConvertFrom-Json | ConvertTo-Json -Depth 5 | Write-Host
    
    # Check rate limit
    $parsed1 = $test1 | ConvertFrom-Json
    if ($parsed1.ok) {
        Write-Success "First request successful"
    } elseif ($parsed1.error_code -eq "rate_limited") {
        Write-Warning "Rate limit active: $($parsed1.error)"
    } else {
        Write-Error "Unexpected error: $($parsed1.error)"
    }
    
    # Second request immediately (rate limit test)
    Write-Info "Second request immediately (rate limit test)..."
    $test2 = curl.exe -s -X POST "https://$ProjectRef.supabase.co/functions/v1/ai-proxy" `
        -H "Content-Type: application/json" `
        -d "@$tempTestBodyFile"
    
    Write-Host "Second response:"
    $test2 | ConvertFrom-Json | ConvertTo-Json -Depth 5 | Write-Host
    
    $parsed2 = $test2 | ConvertFrom-Json
    if ($parsed2.error_code -eq "rate_limited") {
        Write-Success "Rate limit working correctly: $($parsed2.error)"
    } elseif ($parsed2.ok) {
        Write-Warning "Rate limit not active (both requests succeeded)"
    } else {
        Write-Warning "Unexpected response: $($parsed2.error)"
    }
    
    # Cleanup test temp file
    if (Test-Path $tempTestBodyFile) { Remove-Item $tempTestBodyFile -Force }
}

Write-Host "=================================="
Write-Success "All steps completed successfully!"

# Final notes
Write-Info "Important notes:"
Write-Info "1. Set Secrets in Dashboard: GEMINI_API_KEY, SUPABASE_SERVICE_ROLE_KEY"
Write-Info "2. Dashboard: https://supabase.com/dashboard/project/$ProjectRef/settings/functions"
Write-Info "3. Function URL: https://$ProjectRef.supabase.co/functions/v1/ai-proxy"