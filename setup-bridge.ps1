# RevClear Bridge Setup Script
# Run this to configure Notion, GitHub, and ChatGPT integration

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "RevClear - Setup Notion/GitHub Bridge" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Notion Integration
Write-Host "Step 1: Notion Integration" -ForegroundColor Yellow
Write-Host "1. Go to: https://www.notion.so/my-integrations"
Write-Host "2. Click '+ New integration'"
Write-Host "3. Name it: 'RevClear Project'"
Write-Host "4. Copy the Internal Integration Token"
Write-Host ""
$notionToken = Read-Host "Paste your Notion Integration Token (or press Enter to skip)"
Write-Host ""

# Step 2: Notion Database ID
Write-Host "Step 2: Get Notion Database ID" -ForegroundColor Yellow
Write-Host "1. Open your Notion project page"
Write-Host "2. Copy the URL"
Write-Host "3. Extract the ID between notion.so/ and ?v="
Write-Host ""
$notionDbId = Read-Host "Paste your Notion Database ID (or press Enter to skip)"
Write-Host ""

# Step 3: Add to GitHub Secrets
if ($notionToken -and $notionDbId) {
    Write-Host "Step 3: Adding to GitHub Secrets..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Run these commands to add secrets to GitHub:" -ForegroundColor Green
    Write-Host ""
    Write-Host "gh secret set NOTION_TOKEN --body `"$notionToken`"" -ForegroundColor White
    Write-Host "gh secret set NOTION_DATABASE_ID --body `"$notionDbId`"" -ForegroundColor White
    Write-Host ""
    Write-Host "Don't have 'gh' CLI? Install from: https://cli.github.com/"
    Write-Host "Or add manually at: https://github.com/hpppm/revclear/settings/secrets/actions"
    Write-Host ""
} else {
    Write-Host "Skipped GitHub secrets setup" -ForegroundColor Gray
    Write-Host "You can add them later at: https://github.com/hpppm/revclear/settings/secrets/actions"
    Write-Host ""
}

# Step 4: GitHub Student Pack
Write-Host "Step 4: GitHub Student Pack" -ForegroundColor Yellow
Write-Host "Apply for free tools at: https://education.github.com/pack"
Write-Host ""
Write-Host "You'll get:" -ForegroundColor Green
Write-Host "  ✓ GitHub Copilot (already have!)"
Write-Host "  ✓ GitHub Pro"
Write-Host "  ✓ $100/month Azure credits"
Write-Host "  ✓ Free domain name"
Write-Host "  ✓ Free hosting (Heroku)"
Write-Host "  ✓ 80+ more tools!"
Write-Host ""
$openStudentPack = Read-Host "Open GitHub Student Pack in browser? (y/n)"
if ($openStudentPack -eq 'y') {
    Start-Process "https://education.github.com/pack"
}
Write-Host ""

# Step 5: ChatGPT Context
Write-Host "Step 5: ChatGPT Context File" -ForegroundColor Yellow
Write-Host "Created: CHATGPT_CONTEXT.md"
Write-Host ""
Write-Host "To use with ChatGPT:" -ForegroundColor Green
Write-Host "1. Open CHATGPT_CONTEXT.md"
Write-Host "2. Copy the entire content"
Write-Host "3. Paste at start of ChatGPT conversation"
Write-Host "4. Ask your question!"
Write-Host ""

# Step 6: Commit Changes
Write-Host "Step 6: Commit New Files" -ForegroundColor Yellow
$commit = Read-Host "Commit and push these new files to GitHub? (y/n)"
if ($commit -eq 'y') {
    git add .
    git commit -m "Add Notion/GitHub bridge setup and ChatGPT context"
    git push origin main
    Write-Host "✓ Pushed to GitHub!" -ForegroundColor Green
} else {
    Write-Host "Skipped commit. Run manually:" -ForegroundColor Gray
    Write-Host "  git add ."
    Write-Host "  git commit -m 'Add bridge setup'"
    Write-Host "  git push origin main"
}
Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Set up your Notion workspace structure"
Write-Host "2. Add GitHub secrets (if not done)"
Write-Host "3. Apply for GitHub Student Pack"
Write-Host "4. Share CHATGPT_CONTEXT.md with your team"
Write-Host "5. Start using the integrated workflow!"
Write-Host ""
Write-Host "Documentation:" -ForegroundColor Green
Write-Host "  - NOTION_GITHUB_BRIDGE.md (full guide)"
Write-Host "  - CHATGPT_CONTEXT.md (copy/paste for ChatGPT)"
Write-Host ""
Write-Host "Questions? Check the docs or ask in GitHub Issues!" -ForegroundColor Cyan
Write-Host ""
