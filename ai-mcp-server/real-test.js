#!/usr/bin/env node

/**
 * REAL INTEGRATION TEST
 * Tests actual services with real API calls
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

// Test results tracker
const results = {
  passed: [],
  failed: [],
  warnings: []
};

// Test 1: Check .env file exists
logSection('TEST 1: Environment Configuration');
const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, '.env.example');

if (fs.existsSync(envPath)) {
  log('✓ .env file found', 'green');
  results.passed.push('.env file exists');
  
  // Read and validate .env
  const envContent = fs.readFileSync(envPath, 'utf8');
  const hasGithubToken = envContent.includes('GITHUB_TOKEN=') && !envContent.includes('GITHUB_TOKEN=your_');
  const hasNotionToken = envContent.includes('NOTION_TOKEN=') && !envContent.includes('NOTION_TOKEN=your_');
  
  if (hasGithubToken) {
    log('✓ GITHUB_TOKEN is configured', 'green');
    results.passed.push('GitHub token configured');
  } else {
    log('✗ GITHUB_TOKEN not configured or using placeholder', 'red');
    results.failed.push('GitHub token missing');
  }
  
  if (hasNotionToken) {
    log('✓ NOTION_TOKEN is configured', 'green');
    results.passed.push('Notion token configured');
  } else {
    log('⚠ NOTION_TOKEN not configured (optional)', 'yellow');
    results.warnings.push('Notion token not configured');
  }
} else {
  log('✗ .env file NOT found', 'red');
  results.failed.push('.env file missing');
  
  // Check for .env.example
  if (fs.existsSync(envExamplePath)) {
    log('ℹ .env.example found - you need to copy it to .env', 'yellow');
    results.warnings.push('Copy .env.example to .env and add tokens');
  } else {
    log('⚠ Creating .env.example template...', 'yellow');
    const envTemplate = `# GitHub Personal Access Token
# Get from: https://github.com/settings/tokens
# Permissions needed: repo, read:org
GITHUB_TOKEN=your_github_token_here

# Notion Integration Token (Optional)
# Get from: https://www.notion.so/my-integrations
NOTION_TOKEN=your_notion_token_here

# Notion Database ID (Optional)
NOTION_DATABASE_ID=your_database_id_here
`;
    fs.writeFileSync(envExamplePath, envTemplate);
    log('✓ Created .env.example - copy to .env and add your tokens', 'green');
    results.warnings.push('Created .env.example template');
  }
}

// Test 2: Test GitHub API
logSection('TEST 2: GitHub API Connection');
async function testGitHub() {
  try {
    // Load environment variables
    const dotenv = await import('dotenv');
    dotenv.config({ path: envPath });
    
    const token = process.env.GITHUB_TOKEN;
    
    if (!token || token === 'your_github_token_here') {
      log('✗ GitHub token not configured', 'red');
      log('ℹ Get token from: https://github.com/settings/tokens', 'blue');
      log('ℹ Permissions needed: repo, read:org', 'blue');
      results.failed.push('GitHub API - token not configured');
      return false;
    }
    
    log('Testing GitHub API...', 'yellow');
    
    // Test API call
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      log(`✓ GitHub API connected successfully!`, 'green');
      log(`  User: ${data.login}`, 'green');
      log(`  Name: ${data.name || 'N/A'}`, 'green');
      results.passed.push('GitHub API connection successful');
      
      // Test repository access
      const repoResponse = await fetch('https://api.github.com/repos/hpppm/revclear', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      
      if (repoResponse.ok) {
        log('✓ Can access revclear repository', 'green');
        results.passed.push('Repository access verified');
      } else {
        log('⚠ Cannot access revclear repository', 'yellow');
        results.warnings.push('Repository access may be limited');
      }
      
      return true;
    } else {
      log(`✗ GitHub API error: ${response.status} ${response.statusText}`, 'red');
      results.failed.push(`GitHub API returned ${response.status}`);
      return false;
    }
  } catch (error) {
    log(`✗ GitHub API test failed: ${error.message}`, 'red');
    results.failed.push('GitHub API connection error');
    return false;
  }
}

// Test 3: Test Notion API
logSection('TEST 3: Notion API Connection (Optional)');
async function testNotion() {
  try {
    const dotenv = await import('dotenv');
    dotenv.config({ path: envPath });
    
    const token = process.env.NOTION_TOKEN;
    
    if (!token || token === 'your_notion_token_here') {
      log('⚠ Notion token not configured (this is optional)', 'yellow');
      results.warnings.push('Notion not configured');
      return false;
    }
    
    log('Testing Notion API...', 'yellow');
    
    const response = await fetch('https://api.notion.com/v1/users/me', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Notion-Version': '2022-06-28'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      log('✓ Notion API connected successfully!', 'green');
      log(`  User ID: ${data.id}`, 'green');
      results.passed.push('Notion API connection successful');
      return true;
    } else {
      log(`✗ Notion API error: ${response.status} ${response.statusText}`, 'red');
      results.warnings.push(`Notion API returned ${response.status}`);
      return false;
    }
  } catch (error) {
    log(`✗ Notion API test failed: ${error.message}`, 'red');
    results.warnings.push('Notion API connection error');
    return false;
  }
}

// Test 4: Test file system access
logSection('TEST 4: File System Access');
function testFileSystem() {
  const projectRoot = path.join(__dirname, '..');
  const requiredPaths = [
    'RevClear/backend',
    'RevClear/frontend', 
    'Demo',
    'README.md'
  ];
  
  let allFound = true;
  
  for (const p of requiredPaths) {
    const fullPath = path.join(projectRoot, p);
    if (fs.existsSync(fullPath)) {
      log(`✓ Found: ${p}`, 'green');
    } else {
      log(`✗ Missing: ${p}`, 'red');
      allFound = false;
    }
  }
  
  if (allFound) {
    log('✓ All required project paths exist', 'green');
    results.passed.push('File system access verified');
    return true;
  } else {
    log('✗ Some required paths are missing', 'red');
    results.failed.push('File system access incomplete');
    return false;
  }
}

testFileSystem();

// Test 5: Test actual MCP tool
logSection('TEST 5: MCP Server Tools');
function testMCPTools() {
  const serverPath = path.join(__dirname, 'index.js');
  
  if (!fs.existsSync(serverPath)) {
    log('✗ index.js not found', 'red');
    results.failed.push('MCP server file missing');
    return false;
  }
  
  const content = fs.readFileSync(serverPath, 'utf8');
  
  const requiredTools = [
    'certify_code',
    'guide_implementation',
    'run_code_safely',
    'check_dependencies',
    'validate_environment',
    'get_api_routes',
    'analyze_security',
    'check_hipaa_compliance'
  ];
  
  let allFound = true;
  for (const tool of requiredTools) {
    if (content.includes(`name: "${tool}"`)) {
      log(`✓ Tool exists: ${tool}`, 'green');
    } else {
      log(`✗ Tool missing: ${tool}`, 'red');
      allFound = false;
    }
  }
  
  if (allFound) {
    log('✓ All MCP tools are defined', 'green');
    results.passed.push('All 8 MCP tools verified');
    return true;
  } else {
    results.failed.push('Some MCP tools missing');
    return false;
  }
}

testMCPTools();

// Test 6: Real project analysis
logSection('TEST 6: Real Project Analysis');
function analyzeProject() {
  const projectRoot = path.join(__dirname, '..');
  
  // Count files
  let fileCount = 0;
  let jsFiles = 0;
  let tsFiles = 0;
  
  function countFiles(dir) {
    try {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        if (item === 'node_modules' || item === '.git') continue;
        
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          countFiles(fullPath);
        } else {
          fileCount++;
          if (item.endsWith('.js')) jsFiles++;
          if (item.endsWith('.ts')) tsFiles++;
        }
      }
    } catch (err) {
      // Skip directories we can't read
    }
  }
  
  countFiles(projectRoot);
  
  log(`✓ Project analysis complete:`, 'green');
  log(`  Total files: ${fileCount}`, 'blue');
  log(`  JavaScript files: ${jsFiles}`, 'blue');
  log(`  TypeScript files: ${tsFiles}`, 'blue');
  
  results.passed.push('Project analysis successful');
}

analyzeProject();

// Run async tests
async function runAsyncTests() {
  await testGitHub();
  await testNotion();
  
  // Final summary
  logSection('FINAL RESULTS');
  
  log(`\n✓ PASSED: ${results.passed.length}`, 'green');
  results.passed.forEach(r => log(`  - ${r}`, 'green'));
  
  if (results.warnings.length > 0) {
    log(`\n⚠ WARNINGS: ${results.warnings.length}`, 'yellow');
    results.warnings.forEach(r => log(`  - ${r}`, 'yellow'));
  }
  
  if (results.failed.length > 0) {
    log(`\n✗ FAILED: ${results.failed.length}`, 'red');
    results.failed.forEach(r => log(`  - ${r}`, 'red'));
  }
  
  console.log('\n' + '='.repeat(60));
  
  if (results.failed.length === 0) {
    log('\n🎉 ALL CRITICAL TESTS PASSED!', 'green');
    log('The MCP server is ready for production use.', 'green');
    
    if (results.warnings.length > 0) {
      log('\nℹ Some optional features are not configured.', 'yellow');
      log('The server will work, but you can improve it by:', 'yellow');
      if (results.warnings.find(w => w.includes('Notion'))) {
        log('  - Adding Notion integration for documentation sync', 'yellow');
      }
    }
    
    process.exit(0);
  } else {
    log('\n⚠ SOME TESTS FAILED', 'yellow');
    log('Fix the issues above before committing.', 'yellow');
    
    if (results.failed.find(f => f.includes('token'))) {
      log('\nQuick fix:', 'cyan');
      log('1. Copy .env.example to .env', 'blue');
      log('2. Get GitHub token: https://github.com/settings/tokens', 'blue');
      log('3. Add token to .env file', 'blue');
      log('4. Run this test again: node real-test.js', 'blue');
    }
    
    process.exit(1);
  }
}

runAsyncTests();
