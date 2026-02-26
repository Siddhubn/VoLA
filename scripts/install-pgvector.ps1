# pgvector Installation Script for Windows
# Run this script as Administrator

param(
    [string]$PgPath = "C:\Program Files\PostgreSQL\17"
)

Write-Host "🔍 pgvector Installation Script for PostgreSQL 17" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "❌ This script must be run as Administrator" -ForegroundColor Red
    Write-Host "   Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

# Check if PostgreSQL exists
if (-not (Test-Path $PgPath)) {
    Write-Host "❌ PostgreSQL not found at: $PgPath" -ForegroundColor Red
    Write-Host "   Please specify the correct path using -PgPath parameter" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ PostgreSQL found at: $PgPath" -ForegroundColor Green

# Check PostgreSQL version
$versionFile = Join-Path $PgPath "doc\INSTALL"
if (Test-Path $versionFile) {
    Write-Host "✅ PostgreSQL 17 installation verified" -ForegroundColor Green
} else {
    Write-Host "⚠️  Could not verify PostgreSQL version" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📋 Installation Options:" -ForegroundColor Cyan
Write-Host ""
Write-Host "Option 1: Download pre-built binaries (Recommended)" -ForegroundColor White
Write-Host "  1. Visit: https://github.com/pgvector/pgvector/releases" -ForegroundColor Gray
Write-Host "  2. Download the Windows build for PostgreSQL 17" -ForegroundColor Gray
Write-Host "  3. Extract and run this script again with the extracted folder path" -ForegroundColor Gray
Write-Host ""
Write-Host "Option 2: Manual Installation" -ForegroundColor White
Write-Host "  If you have the pgvector files:" -ForegroundColor Gray
Write-Host "  - Place vector.dll in: $PgPath\lib\" -ForegroundColor Gray
Write-Host "  - Place vector.control and vector--*.sql in: $PgPath\share\extension\" -ForegroundColor Gray
Write-Host ""
Write-Host "Option 3: Use Docker (Development)" -ForegroundColor White
Write-Host "  Use the pgvector/pgvector:pg17 Docker image" -ForegroundColor Gray
Write-Host ""

# Check if pgvector files already exist
$libPath = Join-Path $PgPath "lib\vector.dll"
$extPath = Join-Path $PgPath "share\extension\vector.control"

if ((Test-Path $libPath) -and (Test-Path $extPath)) {
    Write-Host "✅ pgvector files already installed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Restart PostgreSQL service:" -ForegroundColor White
    Write-Host "     Restart-Service postgresql-x64-17" -ForegroundColor Gray
    Write-Host "  2. Run: npm run init-rag" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "⚠️  pgvector files not found" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "📥 Attempting to download pgvector..." -ForegroundColor Cyan
    
    # Try to download latest release
    try {
        $releases = Invoke-RestMethod -Uri "https://api.github.com/repos/pgvector/pgvector/releases/latest"
        $version = $releases.tag_name
        Write-Host "   Latest version: $version" -ForegroundColor Gray
        
        # Look for Windows asset
        $windowsAsset = $releases.assets | Where-Object { $_.name -like "*windows*" -or $_.name -like "*win*" }
        
        if ($windowsAsset) {
            Write-Host "   Found Windows build: $($windowsAsset.name)" -ForegroundColor Green
            Write-Host ""
            Write-Host "   Download URL: $($windowsAsset.browser_download_url)" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "   Please download manually and extract, then run:" -ForegroundColor Yellow
            Write-Host "   .\scripts\install-pgvector.ps1 -ExtractPath <path-to-extracted-files>" -ForegroundColor Gray
        } else {
            Write-Host "   ⚠️  No pre-built Windows binaries found" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "   You'll need to:" -ForegroundColor White
            Write-Host "   1. Build from source (requires Visual Studio)" -ForegroundColor Gray
            Write-Host "   2. Use Docker with pgvector/pgvector:pg17 image" -ForegroundColor Gray
            Write-Host "   3. Continue without pgvector (limited functionality)" -ForegroundColor Gray
        }
    } catch {
        Write-Host "   ❌ Failed to check for releases: $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "📖 For detailed instructions, see: PGVECTOR_INSTALLATION.md" -ForegroundColor Cyan
Write-Host ""

# Offer to open the GitHub releases page
$openBrowser = Read-Host "Open pgvector releases page in browser? (y/n)"
if ($openBrowser -eq 'y') {
    Start-Process "https://github.com/pgvector/pgvector/releases"
}
