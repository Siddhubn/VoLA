# Docker PostgreSQL with pgvector management script

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("start", "stop", "restart", "status", "logs", "reset")]
    [string]$Action
)

Write-Host "Docker PostgreSQL with pgvector Manager" -ForegroundColor Cyan
Write-Host ""

switch ($Action) {
    "start" {
        Write-Host "Starting PostgreSQL with pgvector..." -ForegroundColor Green
        docker-compose up -d
        
        Write-Host ""
        Write-Host "Waiting for database to be ready..." -ForegroundColor Yellow
        
        $maxAttempts = 30
        $attempt = 0
        
        do {
            $attempt++
            Start-Sleep -Seconds 2
            $result = docker-compose exec -T postgres pg_isready -U postgres -d vola_db 2>$null
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "Database is ready!" -ForegroundColor Green
                break
            }
            
            Write-Host "   Attempt $attempt/$maxAttempts..." -ForegroundColor Gray
        } while ($attempt -lt $maxAttempts)
        
        if ($attempt -ge $maxAttempts) {
            Write-Host "Database failed to start within timeout" -ForegroundColor Red
            exit 1
        }
        
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "  1. Run: npm run init-db" -ForegroundColor White
        Write-Host "  2. Run: npm run init-quiz" -ForegroundColor White
        Write-Host "  3. Run: npm run init-rag" -ForegroundColor White
        Write-Host ""
        Write-Host "Connection details:" -ForegroundColor Cyan
        Write-Host "  Host: localhost" -ForegroundColor White
        Write-Host "  Port: 5432" -ForegroundColor White
        Write-Host "  Database: vola_db" -ForegroundColor White
        Write-Host "  Username: postgres" -ForegroundColor White
        Write-Host "  Password: admin" -ForegroundColor White
    }
    
    "stop" {
        Write-Host "Stopping PostgreSQL..." -ForegroundColor Yellow
        docker-compose down
        Write-Host "PostgreSQL stopped" -ForegroundColor Green
    }
    
    "restart" {
        Write-Host "Restarting PostgreSQL..." -ForegroundColor Yellow
        docker-compose restart
        Write-Host "PostgreSQL restarted" -ForegroundColor Green
    }
    
    "status" {
        Write-Host "Container status:" -ForegroundColor Cyan
        docker-compose ps
        
        Write-Host ""
        Write-Host "Testing connection..." -ForegroundColor Cyan
        $result = docker-compose exec -T postgres pg_isready -U postgres -d vola_db 2>$null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Database is accessible" -ForegroundColor Green
            
            # Check pgvector
            Write-Host ""
            Write-Host "Checking pgvector extension..." -ForegroundColor Cyan
            $vectorCheck = docker-compose exec -T postgres psql -U postgres -d vola_db -c "SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';" 2>$null
            
            if ($vectorCheck -match "vector") {
                Write-Host "pgvector extension is installed" -ForegroundColor Green
            } else {
                Write-Host "pgvector extension not found" -ForegroundColor Red
            }
        } else {
            Write-Host "Database is not accessible" -ForegroundColor Red
        }
    }
    
    "logs" {
        Write-Host "PostgreSQL logs:" -ForegroundColor Cyan
        docker-compose logs postgres --tail=50 --follow
    }
    
    "reset" {
        Write-Host "This will delete all data! Are you sure? (y/N): " -ForegroundColor Red -NoNewline
        $confirm = Read-Host
        
        if ($confirm -eq 'y' -or $confirm -eq 'Y') {
            Write-Host "Stopping and removing containers..." -ForegroundColor Yellow
            docker-compose down -v
            
            Write-Host "Removing volumes..." -ForegroundColor Yellow
            docker volume rm "user-authentication-and-dashboard_pgvector_data" 2>$null
            
            Write-Host "Database reset complete" -ForegroundColor Green
            Write-Host "Run npm run docker:start to start fresh" -ForegroundColor Cyan
        } else {
            Write-Host "Reset cancelled" -ForegroundColor Yellow
        }
    }
}