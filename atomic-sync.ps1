param (
    [string]$CommitMessage = "Update project bundle"
)

$owner = "engnaderkamel1-sudo"
$repo = "st-john-church-service"
$token = [Environment]::GetEnvironmentVariable('GITHUB_TOKEN', 'User')
$branch = "main"

$headers = @{
    "Authorization" = "Bearer $token"
    "Accept"        = "application/vnd.github+json"
    "User-Agent"    = "PowerShell-Git-Tree-Committer"
}

Write-Host "=== Creating Atomic Single Git Commit via Tree API for $owner/$repo ($branch) ===" -ForegroundColor Cyan

# 1. Get latest commit SHA on main
$ref = Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/git/ref/heads/$branch" -Headers $headers
$parentCommitSha = $ref.object.sha
Write-Host "Parent commit SHA: $parentCommitSha"

# 2. Get tree SHA of parent commit
$parentCommit = Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/git/commits/$parentCommitSha" -Headers $headers
$baseTreeSha = $parentCommit.tree.sha
Write-Host "Base tree SHA: $baseTreeSha"

# 3. Collect local files to sync
$files = Get-ChildItem -Path . -Recurse -File | Where-Object {
    $relativePath = $_.FullName.Substring((Get-Location).Path.Length + 1).Replace("\", "/")
    if ($relativePath -like ".git/*" -or $relativePath -like "node_modules/*" -or $relativePath -like "dist/*" -or $relativePath -like "scratch_*" -or $relativePath -eq "sync-github.ps1" -or $relativePath -eq ".env") {
        return $false
    }
    return $true
}

Write-Host "Found $($files.Count) files to commit." -ForegroundColor Cyan

# 4. Upload blobs for files
$treeEntries = @()
foreach ($file in $files) {
    $relPath = $file.FullName.Substring((Get-Location).Path.Length + 1).Replace("\", "/")
    $contentBytes = [System.IO.File]::ReadAllBytes($file.FullName)
    $base64 = [Convert]::ToBase64String($contentBytes)
    
    $blobBody = @{
        content  = $base64
        encoding = "base64"
    } | ConvertTo-Json
    
    $blobRes = Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/git/blobs" -Headers $headers -Method Post -Body $blobBody -ContentType "application/json"
    
    $treeEntries += @{
        path = $relPath
        mode = "100644"
        type = "blob"
        sha  = $blobRes.sha
    }
    Write-Host "Blob created for: $relPath ($($blobRes.sha.Substring(0,7)))" -ForegroundColor Gray
}

# 5. Create new tree
$treeBody = @{
    base_tree = $baseTreeSha
    tree      = $treeEntries
} | ConvertTo-Json -Depth 5

$newTree = Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/git/trees" -Headers $headers -Method Post -Body $treeBody -ContentType "application/json"
Write-Host "New Tree created: $($newTree.sha)" -ForegroundColor Green

# 6. Create commit
$commitBody = @{
    message = $CommitMessage
    tree    = $newTree.sha
    parents = @($parentCommitSha)
} | ConvertTo-Json

$newCommit = Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/git/commits" -Headers $headers -Method Post -Body $commitBody -ContentType "application/json"
Write-Host "New Commit created: $($newCommit.sha)" -ForegroundColor Green

# 7. Update ref
$updateRefBody = @{
    sha   = $newCommit.sha
    force = $false
} | ConvertTo-Json

$updatedRef = Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/git/refs/heads/$branch" -Headers $headers -Method Patch -Body $updateRefBody -ContentType "application/json"
Write-Host "Ref updated! Main is now at $($updatedRef.object.sha)" -ForegroundColor Green
Write-Host "=== Sync successfully finished with ONE SINGLE COMMIT! ===" -ForegroundColor Cyan
