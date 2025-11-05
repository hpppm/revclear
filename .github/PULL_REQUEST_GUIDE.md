# Pull Request Guide: test-aws → main

## 🤔 What is a Pull Request (PR)?

A **Pull Request** is a way to propose changes from one branch (like `test-aws`) to another branch (like `main`) **before** merging them.

Think of it like:
- ❌ Direct merge: Pushing changes directly to main (risky!)
- ✅ Pull Request: Asking "Hey, can we review these changes before adding to main?"

---

## 📊 Why Use Pull Requests?

### Without PR (Direct Push to Main):
```powershell
git checkout main
git merge test-aws
git push origin main
```
**Problems:**
- ❌ No review process
- ❌ Broken code goes directly to production
- ❌ No discussion about changes
- ❌ Hard to track what changed and why

### With PR (Proper Workflow):
1. Work on `test-aws` branch
2. Create Pull Request: `test-aws` → `main`
3. Team reviews code
4. Run automated tests
5. Approve and merge when ready

**Benefits:**
- ✅ Code review before merging
- ✅ Automated tests run first
- ✅ Discussion and feedback
- ✅ Track history of changes
- ✅ Can revert easily if needed

---

## 🎯 How to Create a Pull Request

### Method 1: GitHub Website (Easiest)

1. **Push your changes to test-aws:**
   ```powershell
   git push origin test-aws
   ```

2. **Go to your repository:**
   ```
   https://github.com/hpppm/revclear
   ```

3. **GitHub will show a banner:**
   ```
   "test-aws had recent pushes"
   [Compare & pull request] button
   ```
   Click that button!

4. **Or manually create PR:**
   - Go to: https://github.com/hpppm/revclear/pulls
   - Click "New pull request"
   - Base: `main` ← Compare: `test-aws`
   - Click "Create pull request"

5. **Fill in details:**
   - Title: "AWS Integration and GitHub Actions Setup"
   - Description: Explain what you changed
   - Click "Create pull request"

### Method 2: GitHub CLI (Advanced)

```powershell
# Install GitHub CLI first: https://cli.github.com/
gh pr create --base main --head test-aws --title "AWS Integration" --body "Added AWS GitHub Actions workflow"
```

---

## 🔍 What Happens After Creating PR?

1. **GitHub Actions Runs:**
   - Your workflow tests the changes
   - Shows if build passes or fails

2. **Review Process:**
   - Team members can review code
   - Leave comments
   - Request changes
   - Approve changes

3. **Merge When Ready:**
   - Click "Merge pull request"
   - Confirm merge
   - Delete `test-aws` branch (optional)

---

## ⚠️ Common PR Problems & Solutions

### Problem 1: "Conflicts with main branch"

**Cause:** Main branch has changes that conflict with your test-aws branch

**Solution:**
```powershell
# Update test-aws with latest main
git checkout test-aws
git pull origin main
# Resolve conflicts
git add .
git commit -m "Resolve merge conflicts"
git push origin test-aws
```

### Problem 2: "Tests are failing"

**Cause:** Your changes broke something

**Solution:**
```powershell
# Fix the issue locally
git add .
git commit -m "Fix failing tests"
git push origin test-aws
# PR will automatically update
```

### Problem 3: "Can't merge - branch protection"

**Cause:** Main branch has protection rules (requires approvals)

**Solution:**
- Wait for required approvals
- Or adjust branch protection settings
- Settings → Branches → Branch protection rules

---

## 🎬 Your Workflow: test-aws → main

### Current State:
```
main branch (production)
  ↓
test-aws branch (your AWS work)
```

### Steps to Merge to Main:

1. **Make sure test-aws is working:**
   ```powershell
   # Check GitHub Actions passed
   # URL: https://github.com/hpppm/revclear/actions
   ```

2. **Create Pull Request:**
   ```powershell
   # Push latest changes
   git push origin test-aws
   
   # Then go to GitHub and create PR
   # https://github.com/hpppm/revclear/compare/main...test-aws
   ```

3. **Review the changes:**
   - Check the "Files changed" tab
   - Review what will be merged

4. **Merge:**
   - Click "Merge pull request"
   - Click "Confirm merge"
   - Done! ✅

---

## 📝 PR Best Practices

### Good PR Title Examples:
- ✅ "Add AWS GitHub Actions integration"
- ✅ "Configure Cognito authentication"
- ✅ "Fix frontend build issues"

### Bad PR Title Examples:
- ❌ "Update"
- ❌ "Changes"
- ❌ "test"

### Good PR Description:
```markdown
## What Changed
- Added GitHub Actions workflow for AWS deployment
- Configured AWS credentials in secrets
- Added PowerShell scripts for AWS management

## Why
- Automate deployment process
- Ensure consistent builds
- Enable CI/CD pipeline

## Testing
- ✅ Backend build passes
- ✅ Frontend build passes
- ✅ AWS connection verified
```

---

## 🚀 Quick Commands

### Create PR (after pushing to test-aws):
```
Open: https://github.com/hpppm/revclear/compare/main...test-aws
```

### View all PRs:
```
https://github.com/hpppm/revclear/pulls
```

### View GitHub Actions:
```
https://github.com/hpppm/revclear/actions
```

---

## ✅ Checklist Before Creating PR

- [ ] All changes committed and pushed
- [ ] GitHub Actions passing (green checkmark)
- [ ] Code reviewed locally
- [ ] No sensitive data (passwords, keys) in code
- [ ] README or docs updated (if needed)

---

## 🆘 If You Just Want to Merge Now

If you're the only developer and just want to merge without review:

```powershell
# Option 1: Direct merge (not recommended)
git checkout main
git merge test-aws
git push origin main

# Option 2: Create and immediately merge PR (better)
# 1. Create PR on GitHub
# 2. Click "Merge pull request" right away
# 3. Click "Confirm merge"
```

**But for team projects, always use the PR process!** 🎯
