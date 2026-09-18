@echo off
REM Setup script for local development environment
REM This script helps you configure your environment for local development

echo ========================================
echo PriceDrop Local Environment Setup
echo ========================================
echo.

REM Check if .env.local exists
if exist .env.local (
    echo .env.local already exists. Skipping creation.
    echo.
    echo Current DATABASE_URL:
    findstr /B "DATABASE_URL" .env.local
    echo.
    choice /C YN /M "Do you want to recreate .env.local"
    if errorlevel 2 goto :end
)

echo.
echo Choose database configuration:
echo 1. SQLite (file-based, current setup)
echo 2. PostgreSQL (recommended for testing migration)
choice /C 12 /M "Select option"

if errorlevel 2 (
    echo.
    echo You chose PostgreSQL
    echo Please enter your PostgreSQL connection string:
    echo Format: postgresql://user:password@localhost:5432/database_name
    set /p DB_URL="DATABASE_URL: "
    
    REM Generate a random secret
    for /f "tokens=*" %%i in ('openssl rand -base64 32 2^>nul') do set SECRET=%%i
    if "%SECRET%"=="" set SECRET=dev-secret-change-in-production-at-least-32-chars-long
    
    (
        echo DATABASE_URL=%DB_URL%
        echo AUTH_SECRET=%SECRET%
        echo AUTH_TRUST_HOST=true
    ) > .env.local
    
    echo.
    echo Created .env.local with PostgreSQL configuration
) else (
    echo.
    echo You chose SQLite
    REM Generate a random secret
    for /f "tokens=*" %%i in ('openssl rand -base64 32 2^>nul') do set SECRET=%%i
    if "%SECRET%"=="" set SECRET=dev-secret-change-in-production-at-least-32-chars-long
    
    (
        echo DATABASE_URL=file:./dev.db
        echo AUTH_SECRET=%SECRET%
        echo AUTH_TRUST_HOST=true
    ) > .env.local
    
    echo.
    echo Created .env.local with SQLite configuration
)

:end
echo.
echo ========================================
echo Setup complete!
echo ========================================
echo.
echo Next steps:
echo 1. Run: npm run db:generate
echo 2. Run: npm run db:push
echo 3. Run: npm run dev
echo.
pause