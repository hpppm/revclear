# AWS + GitHub Actions Setup Script for PowerShell
# Run this script to set up your local environment and test AWS connection

Write-Host "=== AWS + GitHub Actions Setup ===" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "⚠️  Warning: Not running as Administrator. Some installations may fail." -ForegroundColor Yellow
    Write-Host "   Consider running: Start-Process powershell -Verb RunAs" -ForegroundColor Yellow
    Write-Host ""
}

# Step 1: Check AWS CLI installation
Write-Host "Step 1: Checking AWS CLI..." -ForegroundColor Cyan
try {
    $awsVersion = aws --version
    Write-Host "✅ AWS CLI installed: $awsVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ AWS CLI not installed" -ForegroundColor Red
    Write-Host "   Download from: https://aws.amazon.com/cli/" -ForegroundColor Yellow
    $installCLI = Read-Host "   Install AWS CLI now? (y/n)"
    if ($installCLI -eq "y") {
        Write-Host "   Opening download page..." -ForegroundColor Yellow
        Start-Process "https://awscli.amazonaws.com/AWSCLIV2.msi"
    }
}
Write-Host ""

# Step 2: Install AWS Tools for PowerShell
Write-Host "Step 2: Installing AWS Tools for PowerShell..." -ForegroundColor Cyan
try {
    $modules = @(
        "AWS.Tools.Common",
        "AWS.Tools.RDS",
        "AWS.Tools.CognitoIdentityProvider",
        "AWS.Tools.S3",
        "AWS.Tools.SecretsManager",
        "AWS.Tools.CloudWatchLogs"
    )
    
    foreach ($module in $modules) {
        if (Get-Module -ListAvailable -Name $module) {
            Write-Host "   ✓ $module already installed" -ForegroundColor Gray
        } else {
            Write-Host "   Installing $module..." -ForegroundColor Yellow
            Install-Module -Name $module -Force -AllowClobber -Scope CurrentUser
            Write-Host "   ✅ $module installed" -ForegroundColor Green
        }
    }
} catch {
    Write-Host "❌ Failed to install AWS Tools: $_" -ForegroundColor Red
}
Write-Host ""

# Step 3: Configure AWS Credentials
Write-Host "Step 3: Configure AWS Credentials" -ForegroundColor Cyan
Write-Host "   You can configure credentials in three ways:" -ForegroundColor Gray
Write-Host "   1. Use 'aws configure' command" -ForegroundColor Gray
Write-Host "   2. Set environment variables" -ForegroundColor Gray
Write-Host "   3. Use AWS credentials file" -ForegroundColor Gray
Write-Host ""

$configureNow = Read-Host "Configure AWS credentials now? (y/n)"
if ($configureNow -eq "y") {
    Write-Host ""
    Write-Host "   Enter your AWS credentials:" -ForegroundColor Yellow
    $accessKey = Read-Host "   AWS Access Key ID"
    $secretKey = Read-Host "   AWS Secret Access Key" -AsSecureString
    $region = Read-Host "   AWS Region (default: us-east-1)"
    
    if ([string]::IsNullOrWhiteSpace($region)) {
        $region = "us-east-1"
    }
    
    # Set environment variables
    $env:AWS_ACCESS_KEY_ID = $accessKey
    $env:AWS_SECRET_ACCESS_KEY = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secretKey))
    $env:AWS_REGION = $region
    
    Write-Host "   ✅ Credentials set for this session" -ForegroundColor Green
    Write-Host "   ⚠️  These will be lost when you close PowerShell" -ForegroundColor Yellow
    Write-Host ""
    
    # Test connection
    Write-Host "   Testing AWS connection..." -ForegroundColor Yellow
    try {
        $caller = Get-STSCallerIdentity
        Write-Host "   ✅ Successfully connected to AWS!" -ForegroundColor Green
        Write-Host "   Account: $($caller.Account)" -ForegroundColor Gray
        Write-Host "   User ARN: $($caller.Arn)" -ForegroundColor Gray
    } catch {
        Write-Host "   ❌ Failed to connect to AWS: $_" -ForegroundColor Red
    }
}
Write-Host ""

# Step 4: Check AWS Resources
Write-Host "Step 4: Checking AWS Resources..." -ForegroundColor Cyan
if ($env:AWS_ACCESS_KEY_ID) {
    try {
        # Check Cognito User Pools
        Write-Host "   Cognito User Pools:" -ForegroundColor Yellow
        $userPools = Get-CGIPUserPoolList -MaxResult 10
        if ($userPools.Count -gt 0) {
            foreach ($pool in $userPools) {
                Write-Host "      ✓ $($pool.Name) - ID: $($pool.Id)" -ForegroundColor Gray
            }
        } else {
            Write-Host "      No user pools found" -ForegroundColor Gray
        }
        Write-Host ""
        
        # Check S3 Buckets
        Write-Host "   S3 Buckets:" -ForegroundColor Yellow
        $buckets = Get-S3Bucket
        if ($buckets.Count -gt 0) {
            foreach ($bucket in $buckets) {
                Write-Host "      ✓ $($bucket.BucketName)" -ForegroundColor Gray
            }
        } else {
            Write-Host "      No buckets found" -ForegroundColor Gray
        }
        Write-Host ""
        
        # Check RDS Instances
        Write-Host "   RDS Instances:" -ForegroundColor Yellow
        $rdsInstances = Get-RDSDBInstance
        if ($rdsInstances.Count -gt 0) {
            foreach ($instance in $rdsInstances) {
                Write-Host "      ✓ $($instance.DBInstanceIdentifier) - Status: $($instance.DBInstanceStatus)" -ForegroundColor Gray
            }
        } else {
            Write-Host "      No RDS instances found" -ForegroundColor Gray
        }
        Write-Host ""
        
    } catch {
        Write-Host "   ⚠️  Could not list all resources: $_" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ⚠️  AWS credentials not configured. Skipping resource check." -ForegroundColor Yellow
}
Write-Host ""

# Step 5: GitHub Configuration
Write-Host "Step 5: Configure GitHub Secrets" -ForegroundColor Cyan
Write-Host "   To use AWS with GitHub Actions, you need to add secrets:" -ForegroundColor Gray
Write-Host ""
Write-Host "   Required Secrets:" -ForegroundColor Yellow
Write-Host "   - AWS_ACCESS_KEY_ID" -ForegroundColor Gray
Write-Host "   - AWS_SECRET_ACCESS_KEY" -ForegroundColor Gray
Write-Host "   - AWS_REGION" -ForegroundColor Gray
Write-Host ""
Write-Host "   Optional Secrets:" -ForegroundColor Yellow
Write-Host "   - AWS_USER_POOL_ID" -ForegroundColor Gray
Write-Host "   - AWS_CLIENT_ID" -ForegroundColor Gray
Write-Host "   - AWS_S3_BUCKET" -ForegroundColor Gray
Write-Host "   - DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD" -ForegroundColor Gray
Write-Host ""

$openGitHub = Read-Host "Open GitHub Secrets page in browser? (y/n)"
if ($openGitHub -eq "y") {
    Start-Process "https://github.com/hpppm/revclear/settings/secrets/actions"
}
Write-Host ""

# Step 6: Test Cognito Users
Write-Host "Step 6: List Cognito Users (Optional)" -ForegroundColor Cyan
if ($env:AWS_ACCESS_KEY_ID) {
    $listUsers = Read-Host "Do you want to list users from a Cognito User Pool? (y/n)"
    if ($listUsers -eq "y") {
        $userPoolId = Read-Host "Enter User Pool ID (e.g., us-east-1_xxxxxxxxx)"
        try {
            Write-Host "   Fetching users from pool: $userPoolId..." -ForegroundColor Yellow
            $users = Get-CGIPUserList -UserPoolId $userPoolId -Limit 50
            Write-Host "   Found $($users.Count) users:" -ForegroundColor Green
            foreach ($user in $users) {
                Write-Host "      ✓ $($user.Username) - Status: $($user.UserStatus)" -ForegroundColor Gray
            }
        } catch {
            Write-Host "   ❌ Failed to list users: $_" -ForegroundColor Red
        }
    }
} else {
    Write-Host "   ⚠️  AWS credentials not configured. Skipping user list." -ForegroundColor Yellow
}
Write-Host ""

# Step 7: Git Configuration
Write-Host "Step 7: Push to test-aws branch" -ForegroundColor Cyan
Write-Host "   Current branch: " -NoNewline
$currentBranch = git branch --show-current
Write-Host "$currentBranch" -ForegroundColor Yellow
Write-Host ""

if ($currentBranch -ne "test-aws") {
    Write-Host "   ⚠️  You're not on the test-aws branch" -ForegroundColor Yellow
    $switchBranch = Read-Host "   Switch to test-aws branch? (y/n)"
    if ($switchBranch -eq "y") {
        git checkout test-aws
        Write-Host "   ✅ Switched to test-aws branch" -ForegroundColor Green
    }
}
Write-Host ""

$pushChanges = Read-Host "Push changes to trigger GitHub Actions? (y/n)"
if ($pushChanges -eq "y") {
    Write-Host "   Adding files..." -ForegroundColor Yellow
    git add .
    
    $commitMsg = Read-Host "   Enter commit message (default: 'Configure AWS + GitHub Actions')"
    if ([string]::IsNullOrWhiteSpace($commitMsg)) {
        $commitMsg = "Configure AWS + GitHub Actions"
    }
    
    git commit -m $commitMsg
    git push origin test-aws
    
    Write-Host "   ✅ Changes pushed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "   View workflow at: https://github.com/hpppm/revclear/actions" -ForegroundColor Cyan
    
    $openActions = Read-Host "   Open Actions page? (y/n)"
    if ($openActions -eq "y") {
        Start-Process "https://github.com/hpppm/revclear/actions"
    }
}
Write-Host ""

# Summary
Write-Host "=== Setup Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. ✓ AWS Tools installed" -ForegroundColor Gray
Write-Host "2. ✓ AWS credentials configured (if done)" -ForegroundColor Gray
Write-Host "3. ➜ Configure GitHub Secrets: https://github.com/hpppm/revclear/settings/secrets/actions" -ForegroundColor Yellow
Write-Host "4. ➜ Push to test-aws branch to trigger workflow" -ForegroundColor Yellow
Write-Host "5. ➜ Monitor workflow: https://github.com/hpppm/revclear/actions" -ForegroundColor Yellow
Write-Host ""
Write-Host "📖 Full guide: .github/GITHUB_AWS_SETUP.md" -ForegroundColor Cyan
Write-Host ""
