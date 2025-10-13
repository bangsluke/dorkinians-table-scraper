# Self-hosted runner setup script for Windows PowerShell
# This script helps set up a self-hosted GitHub Actions runner on Windows

Write-Host "🚀 Setting up self-hosted runner for Dorkinians Table Scraper" -ForegroundColor Green
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: Please run this script from the project root directory" -ForegroundColor Red
    exit 1
}

# Create runner directory
$RUNNER_DIR = "actions-runner"
if (Test-Path $RUNNER_DIR) {
    Write-Host "⚠️  Runner directory already exists. Removing..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force $RUNNER_DIR
}

New-Item -ItemType Directory -Path $RUNNER_DIR
Set-Location $RUNNER_DIR

Write-Host "📥 Downloading GitHub Actions runner for Windows..." -ForegroundColor Blue
$downloadUrl = "https://github.com/actions/runner/releases/download/v2.328.0/actions-runner-win-x64-2.328.0.zip"
$outputFile = "actions-runner-win-x64-2.328.0.zip"

try {
    Invoke-WebRequest -Uri $downloadUrl -OutFile $outputFile
    Write-Host "✅ Download completed!" -ForegroundColor Green
} catch {
    Write-Host "❌ Download failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "📦 Extracting runner package..." -ForegroundColor Blue
try {
    Expand-Archive -Path $outputFile -DestinationPath "." -Force
    Write-Host "✅ Extraction completed!" -ForegroundColor Green
} catch {
    Write-Host "❌ Extraction failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "🔧 Runner package ready!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Go to your GitHub repository" -ForegroundColor White
Write-Host "2. Click Settings → Actions → Runners" -ForegroundColor White
Write-Host "3. Click 'New self-hosted runner'" -ForegroundColor White
Write-Host "4. Choose 'Windows' as the runner image" -ForegroundColor White
Write-Host "5. Copy the configuration command" -ForegroundColor White
Write-Host "6. Run: .\config.cmd --url [URL] --token [TOKEN]" -ForegroundColor White
Write-Host "7. Run: .\run.cmd to start the runner" -ForegroundColor White
Write-Host ""
Write-Host "The runner will use your local IP address, bypassing the FA website blocking." -ForegroundColor Cyan
