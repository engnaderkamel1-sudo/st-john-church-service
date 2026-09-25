param (
    [string]$CommitMessage = "Update project files"
)

$owner = "engnaderkamel1-sudo"
$repo = "st-john-church-service"
$token = "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"
$branch = "main"

$headers = @{
    "Authorization" = "Bearer $token"
    "Accept"        = "application/vnd.github+json"
    "User-Agent"    = "PowerShell-Uploader"
}

Write-Host "=== Starting GitHub Sync for $owner/$repo ($branch) ===" -ForegroundColor Cyan

# Collect files to upload (excluding ignored files)
$excludePatterns = @("node_modules", ".git", "dist", "sync-github.ps1", ".env")
$files = Get-ChildItem -Path . -Recurse -File | Where-Object {
    $relativePath = $_.FullName.Substring((Get-Location).Path.Length + 1)
    $ignore = $false
    foreach ($p in $excludePatterns) {
        if ($relativePath -like "*$p*") { $ignore = $true; break }
    }
    -not $ignore
}

Write-Host "Found $($files.Count) files to sync." -ForegroundColor Cyan

foreach ($file in $files) {
    $relativePath = $file.FullName.Substring((Get-Location).Path.Length + 1).Replace("\", "/")
    $contentBytes = [System.IO.File]::ReadAllBytes($file.FullName)
    $base64Content = [Convert]::ToBase64String($contentBytes)
    
    # Check if file exists to get its SHA
    $getFileUrl = "https://api.github.com/repos/$owner/$repo/contents/$relativePath`?ref=$branch"
    $fileSha = $null
    try {
        $existing = Invoke-RestMethod -Uri $getFileUrl -Headers $headers -Method Get -ErrorAction Stop
        $fileSha = $existing.sha
    } catch {
        # File doesn't exist yet, proceed with null sha
    }

    $bodyObj = @{
        message = "$CommitMessage - $relativePath"
        content = $base64Content
        branch  = $branch
    }
    if ($fileSha) {
        $bodyObj["sha"] = $fileSha
    }

    $putUrl = "https://api.github.com/repos/$owner/$repo/contents/$relativePath"
    $putBody = $bodyObj | ConvertTo-Json

    try {
        $res = Invoke-RestMethod -Uri $putUrl -Headers $headers -Method Put -Body $putBody -ContentType "application/json"
        Write-Host "Synced: $relativePath" -ForegroundColor Green
    } catch {
        Write-Host "Failed to sync $relativePath : $_" -ForegroundColor Red
    }
}

Write-Host "=== Sync complete! ===" -ForegroundColor Cyan
