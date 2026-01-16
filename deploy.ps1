# Deploy script for Windows (using SCP via SSH config)
Write-Host "Starting deployment to Xserver..."
Write-Host "Target: kohinata3.xsrv.jp (Host: xserver)"

# Build the project first
Write-Host "Building project..."
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed. Aborting deployment." -ForegroundColor Red
    exit 1
}

if (-not (Test-Path "dist")) {
    Write-Host "Error: 'dist' directory not found after build." -ForegroundColor Red
    exit 1
}

# Sync backend code (xserver-php) to deploy folder
Write-Host "Syncing backend code (xserver-php) to deploy folder..."
# Create deploy directory if it doesn't exist
if (-not (Test-Path "deploy")) {
    New-Item -Path "deploy" -ItemType Directory | Out-Null
}

# Copy backend files/folders
if (Test-Path "deploy/api") { Remove-Item "deploy/api" -Recurse -Force -ErrorAction SilentlyContinue }
if (Test-Path "deploy/utils") { Remove-Item "deploy/utils" -Recurse -Force -ErrorAction SilentlyContinue }
if (Test-Path "deploy/config") { Remove-Item "deploy/config" -Recurse -Force -ErrorAction SilentlyContinue }

Copy-Item -Path "xserver-php/api" -Destination "deploy/api" -Recurse -Force
Copy-Item -Path "xserver-php/utils" -Destination "deploy/utils" -Recurse -Force
Copy-Item -Path "xserver-php/config" -Destination "deploy/config" -Recurse -Force
Copy-Item -Path "xserver-php/.htaccess" -Destination "deploy/.htaccess" -Force
Copy-Item -Path "xserver-php/*.php" -Destination "deploy" -Force


# Copy index.html and assets from dist to deploy
Copy-Item -Path "dist/index.html" -Destination "deploy/index.html" -Force
if (Test-Path "deploy/assets") {
    Remove-Item "deploy/assets" -Recurse -Force
}
Copy-Item -Path "dist/assets" -Destination "deploy/assets" -Recurse -Force
# Copy any other root files from dist (like logo.png, etc)
Get-ChildItem -Path "dist" -File | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination "deploy/$($_.Name)" -Force
}

# Ensure deploy directory exists
if (-not (Test-Path "deploy")) {
    Write-Host "Error: 'deploy' directory not found." -ForegroundColor Red
    exit 1
}

# Upload files using SCP
# Using -r for recursive, and trailing slash semantics to ensure contents are copied to destination dir
# Note: scp syntax for upload is local_source remote_dest
# Using ssh config alias 'xserver'
Write-Host "Uploading 'deploy' contents..."
scp -r deploy/* xserver:~/kohinata3.xsrv.jp/public_html/

# Fix permissions
Write-Host "Fixing file permissions..."
# Recursively set directories to 755 and files to 644 for the entire site structure
ssh xserver "find ~/kohinata3.xsrv.jp/public_html -type d -exec chmod 755 {} + && find ~/kohinata3.xsrv.jp/public_html -type f -exec chmod 644 {} +"

if ($LASTEXITCODE -eq 0) {
    Write-Host "Deployment completed successfully!" -ForegroundColor Green
    Write-Host "URL: https://kohinata3.xsrv.jp/"
}
else {
    Write-Host "Deployment failed. Please check your SSH connection." -ForegroundColor Red
}
