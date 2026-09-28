# Test FANOS Login API
Write-Host "Testing FANOS Login API..." -ForegroundColor Cyan

Start-Sleep -Seconds 3

$loginData = @{
    username = "mulugeta.ababi"
    password = "FanosAdmin2026!"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/auth/login" -Method POST -Body $loginData -ContentType "application/json"
    
    Write-Host "Login successful!" -ForegroundColor Green
    Write-Host "Token: $($response.access_token.Substring(0, 50))..." -ForegroundColor Yellow
    Write-Host "User: $($response.user.full_name) ($($response.user.role))" -ForegroundColor Yellow
} catch {
    Write-Host "Login failed!" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    
    # Check if backend is running
    $backendUp = $false
    try {
        $health = Invoke-RestMethod -Uri "http://localhost:8000/health" -TimeoutSec 2
        $backendUp = $true
    } catch {
        Write-Host "Backend is not responding on port 8000" -ForegroundColor Red
    }
    
    if (!$backendUp) {
        Write-Host "Please wait for backend to start..." -ForegroundColor Yellow
    }
}
