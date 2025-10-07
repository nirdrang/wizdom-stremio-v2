# PowerShell script to update TorrServer settings
$torrServerUrl = "http://192.168.1.89:8090"
$settingsFile = "torrserver-config.json"

# Read the settings from file
$settings = Get-Content $settingsFile -Raw

# Send settings to TorrServer
$response = Invoke-RestMethod -Uri "$torrServerUrl/settings" -Method Post -Body $settings -ContentType "application/json"

Write-Host "TorrServer settings updated successfully!"
Write-Host "Response: $response"
