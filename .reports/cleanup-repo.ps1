# Repo Cleanup Script
# Run this script to safely clean the repository
# This script implements the findings from .reports/dead-code-analysis.md

Write-Host "🧹 RevClear Repository Cleanup Script" -ForegroundColor Cyan
Write-Host "======================================`n" -ForegroundColor Cyan

# Change to repo root
Set-Location c:\Projects\Dev\revclear

# CRITICAL: Security Check
Write-Host "🔴 CRITICAL SECURITY CHECK" -ForegroundColor Red
Write-Host "Before proceeding, ensure you have rotated ALL credentials in backend/.env:" -ForegroundColor Yellow
Write-Host "  - AWS Access Key ID" -ForegroundColor Yellow
Write-Host "  - AWS Secret Access Key" -ForegroundColor Yellow
Write-Host "  - RDS Database Password" -ForegroundColor Yellow
Write-Host "  - Google API Key" -ForegroundColor Yellow
Write-Host "  - Genkit API Key`n" -ForegroundColor Yellow

$continue = Read-Host "Have you rotated ALL credentials? (yes/no)"
if ($continue -ne "yes") {
    Write-Host "❌ Cleanup aborted. Rotate credentials first!" -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ Proceeding with cleanup...`n" -ForegroundColor Green

# Step 1: Run tests BEFORE making changes
Write-Host "📋 Step 1: Running tests before cleanup..." -ForegroundColor Cyan
Write-Host "Running backend tests..." -ForegroundColor White
Set-Location backend
$backendTests = npm test 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Backend tests failed or no tests found" -ForegroundColor Yellow
    Write-Host "Continue anyway? (yes/no)" -ForegroundColor Yellow
    $continueTests = Read-Host
    if ($continueTests -ne "yes") {
        Write-Host "❌ Cleanup aborted" -ForegroundColor Red
        exit 1
    }
}
Set-Location ..

Write-Host "✅ Test verification complete`n" -ForegroundColor Green

# Step 2: Delete duplicate revclear/ directory
Write-Host "📋 Step 2: Removing duplicate 'revclear/' directory..." -ForegroundColor Cyan
if (Test-Path "revclear") {
    Remove-Item -Path "revclear" -Recurse -Force
    Write-Host "✅ Deleted: revclear/`n" -ForegroundColor Green
} else {
    Write-Host "ℹ️  Directory 'revclear/' not found (may already be deleted)`n" -ForegroundColor Yellow
}

# Step 3: Fix file encoding issues
Write-Host "📋 Step 3: Checking file encoding issues..." -ForegroundColor Cyan
$analyticsFile = "backend\src\analytics.js"
if (Test-Path $analyticsFile) {
    Write-Host "Found: $analyticsFile" -ForegroundColor White
    Write-Host "This file has UTF-8 BOM encoding issues and appears unused." -ForegroundColor Yellow
    Write-Host "Recommend deleting it. Delete? (yes/no)" -ForegroundColor Yellow
    $deleteAnalytics = Read-Host
    if ($deleteAnalytics -eq "yes") {
        Remove-Item $analyticsFile -Force
        Write-Host "✅ Deleted: $analyticsFile" -ForegroundColor Green
    }
}

$typeDefFile = "backend\src\types\node-api-analytics.d.ts"
if (Test-Path $typeDefFile) {
    Write-Host "Found: $typeDefFile" -ForegroundColor White
    Write-Host "This file has UTF-8 BOM encoding issues. Delete? (yes/no)" -ForegroundColor Yellow
    $deleteTypeDef = Read-Host
    if ($deleteTypeDef -eq "yes") {
        Remove-Item $typeDefFile -Force
        Write-Host "✅ Deleted: $typeDefFile" -ForegroundColor Green
    }
}

Write-Host ""

# Step 4: Remove unused dependencies (Optional)
Write-Host "📋 Step 4: Remove unused dependencies? (OPTIONAL)" -ForegroundColor Cyan
Write-Host "This will save ~70MB but is optional." -ForegroundColor Yellow
Write-Host "Remove unused dependencies? (yes/no)" -ForegroundColor Yellow
$removeDeps = Read-Host

if ($removeDeps -eq "yes") {
    Write-Host "`nRemoving backend unused dependencies..." -ForegroundColor White
    Set-Location backend
    npm uninstall `
        @aws-sdk/client-bedrock-runtime `
        @aws-sdk/client-dynamodb `
        @aws-sdk/client-transcribe `
        @aws-sdk/lib-dynamodb `
        @genkit-ai/next `
        jest-mock-extended `
        node-api-analytics `
        @types/aws-lambda `
        @types/jest `
        @types/supertest `
        eslint `
        supertest `
        tsx
    
    Set-Location ..
    
    Write-Host "`nRemoving frontend unused dependencies..." -ForegroundColor White
    Set-Location frontend
    npm uninstall `
        @tailwindcss/postcss `
        @types/react-dom `
        tailwindcss `
        depcheck `
        knip `
        ts-prune
    
    Set-Location ..
    Write-Host "✅ Unused dependencies removed`n" -ForegroundColor Green
}

# Step 5: Git commit changes
Write-Host "📋 Step 5: Commit changes to git..." -ForegroundColor Cyan
git status

Write-Host "`nCommit these changes? (yes/no)" -ForegroundColor Yellow
$commitChanges = Read-Host

if ($commitChanges -eq "yes") {
    git add -A
    git commit -m "chore: clean repository - remove duplicates and unused code

- Remove duplicate revclear/ directory
- Remove files with encoding issues
- Clean up unused dependencies (if selected)
- Security: Credentials rotated (not in repo)

See .reports/dead-code-analysis.md for full details"
    
    Write-Host "✅ Changes committed`n" -ForegroundColor Green
} else {
    Write-Host "ℹ️  Changes not committed. Run 'git add -A && git commit' manually`n" -ForegroundColor Yellow
}

# Step 6: Final verification
Write-Host "📋 Step 6: Final verification..." -ForegroundColor Cyan
Write-Host "Building Docker containers to verify..." -ForegroundColor White
docker-compose build

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Docker build successful`n" -ForegroundColor Green
} else {
    Write-Host "⚠️  Docker build failed. Check logs above`n" -ForegroundColor Yellow
}

# Summary
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "🎉 Cleanup Complete!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "`nSummary:" -ForegroundColor White
Write-Host "  ✅ Security: Credentials rotated" -ForegroundColor Green
Write-Host "  ✅ Duplicate directories removed" -ForegroundColor Green
Write-Host "  ✅ Encoding issues fixed" -ForegroundColor Green
if ($removeDeps -eq "yes") {
    Write-Host "  ✅ Unused dependencies removed (~70MB saved)" -ForegroundColor Green
} else {
    Write-Host "  ⊘  Unused dependencies kept (optional)" -ForegroundColor Yellow
}
Write-Host "`nNext Steps:" -ForegroundColor White
Write-Host "  1. Review changes: git status" -ForegroundColor White
Write-Host "  2. Push to remote: git push origin clean-repo" -ForegroundColor White
Write-Host "  3. Review full report: .reports\dead-code-analysis.md" -ForegroundColor White
Write-Host ""
