# Check pgvector installation status
$PgPath = "C:\Program Files\PostgreSQL\17"

Write-Host "Checking pgvector installation..." -ForegroundColor Cyan
Write-Host ""

# Check if PostgreSQL exists
if (-not (Test-Path $PgPath)) {
    Write-Host "PostgreSQL not found at: $PgPath" -ForegroundColor Red
    exit 1
}

Write-Host "PostgreSQL found at: $PgPath" -ForegroundColor Green

# Check for pgvector files
$libPath = Join-Path $PgPath "lib\vector.dll"
$extPath = Join-Path $PgPath "share\extension\vector.control"

Write-Host ""
Write-Host "Checking for pgvector files:" -ForegroundColor Cyan
Write-Host "  vector.dll: " -NoNewline
if (Test-Path $libPath) {
    Write-Host "FOUND" -ForegroundColor Green
} else {
    Write-Host "NOT FOUND" -ForegroundColor Red
}

Write-Host "  vector.control: " -NoNewline
if (Test-Path $extPath) {
    Write-Host "FOUND" -ForegroundColor Green
} else {
    Write-Host "NOT FOUND" -ForegroundColor Red
}

Write-Host ""

if ((Test-Path $libPath) -and (Test-Path $extPath)) {
    Write-Host "pgvector is installed!" -ForegroundColor Green
    Write-Host "Run 'npm run init-rag' to enable it in your database" -ForegroundColor Yellow
} else {
    Write-Host "pgvector is NOT installed" -ForegroundColor Red
    Write-Host ""
    Write-Host "To install pgvector:" -ForegroundColor Cyan
    Write-Host "1. Visit: https://github.com/pgvector/pgvector/releases" -ForegroundColor White
    Write-Host "2. Download Windows binaries for PostgreSQL 17" -ForegroundColor White
    Write-Host "3. Extract and copy files:" -ForegroundColor White
    Write-Host "   - vector.dll -> $PgPath\lib\" -ForegroundColor Gray
    Write-Host "   - vector.control and vector--*.sql -> $PgPath\share\extension\" -ForegroundColor Gray
    Write-Host "4. Restart PostgreSQL service" -ForegroundColor White
    Write-Host "5. Run 'npm run init-rag'" -ForegroundColor White
}
