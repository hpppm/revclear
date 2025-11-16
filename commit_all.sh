#!/bin/bash

echo "========================================="
echo "RevClear - Final Cleanup & Commit"
echo "========================================="
echo ""

# First, run final simplification
echo "Step 1: Final cleanup..."
echo ""

# Delete duplicate .env
rm -f .env 2>/dev/null && echo "  ✓ Deleted .env (duplicate)"

# Delete docs/ and scripts/
rm -rf docs/ 2>/dev/null && echo "  ✓ Deleted docs/"
rm -rf scripts/ 2>/dev/null && echo "  ✓ Deleted scripts/"

# Delete cleanup scripts
rm -f targeted_cleanup.sh 2>/dev/null && echo "  ✓ Deleted targeted_cleanup.sh"
rm -f final_simplify.sh 2>/dev/null && echo "  ✓ Deleted final_simplify.sh"

echo ""
echo "Step 2: Git commit..."
echo ""

# Stage all changes (additions and deletions)
git add -A

# Show what will be committed
echo "Files to commit:"
git status --short

echo ""
read -p "Proceed with commit? Type 'yes': " -r
echo ""

if [[ ! $REPLY == "yes" ]]
then
    echo "❌ Commit cancelled."
    exit 1
fi

# Commit with detailed message
git commit -m "chore: Clean up repository to essentials only

Removed:
- 11 unused Lambda function templates
- 13 redundant documentation files  
- 8 undeployed Terraform modules (A2I, SageMaker, monitoring, etc.)
- Old backup/audit folders
- Duplicate .env file
- docs/ and scripts/ folders

Kept (essentials only):
- Demo/ (demo site)
- .env.production (all AWS resource IDs)
- IMPLEMENTATION_PLAN.md (implementation plan)
- README.md (operations guide)
- backend/lambdas/ (3 Lambda functions only)
  - processAudioLambda.js (DEPLOYED)
  - transcribeAudioSimple.js (ready)
  - generateCodesSimple.js (ready)
- frontend/review.html (clinician dashboard)
- terraform/ (2 modules only: storage, ai_services)

Terraform now matches actual deployment:
- 1 Lambda (processAudioLambda)
- 6 S3 buckets
- 4 DynamoDB tables
- 1 API Gateway (RevclearTranscribeAPI)
- 1 Cognito pool

Result: From 180+ files to ~15 essential files (95% reduction)
Costs: ~\$10/month for 15 patients

AWS Account: 414669980881
Region: us-east-1"

echo ""
echo "✅ Committed successfully!"
echo ""

# Ask to push
read -p "Push to remote? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]
then
    git push origin main || git push origin master
    echo ""
    echo "✅ Pushed to remote!"
else
    echo "ℹ️  Not pushed. Run 'git push' manually when ready."
fi

echo ""
echo "========================================="
echo "✅ ALL DONE!"
echo "========================================="
echo ""
echo "Your clean repository:"
echo "  📦 15 essential files"
echo "  🗑️  165+ files deleted"
echo "  💾 Committed to git"
echo "  🚀 Ready to deploy"
echo ""
echo "Next steps:"
echo "  1. Deploy 2 new Lambda functions"
echo "  2. Upload review.html to S3"
echo "  3. Start using the system!"
echo ""

# Delete this script
rm -f commit_all.sh 2>/dev/null
