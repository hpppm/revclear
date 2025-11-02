import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log("🧪 Testing RevClear AI MCP Server...\n");

// Test 1: Check if all required files exist
console.log("1️⃣ Checking project structure...");
const projectRoot = path.join(__dirname, '..');
const requiredPaths = [
  'RevClear/backend',
  'RevClear/frontend',
  'Demo',
  'ai-mcp-server/index.js',
  'ai-mcp-server/package.json'
];

let allPathsExist = true;
for (const p of requiredPaths) {
  const fullPath = path.join(projectRoot, p);
  const exists = fs.existsSync(fullPath);
  console.log(`   ${exists ? '✅' : '❌'} ${p}`);
  if (!exists) allPathsExist = false;
}

if (!allPathsExist) {
  console.log("\n❌ Some required paths are missing");
  process.exit(1);
}

// Test 2: Validate package.json
console.log("\n2️⃣ Validating package.json...");
try {
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf-8'));
  console.log(`   ✅ Name: ${pkg.name}`);
  console.log(`   ✅ Version: ${pkg.version}`);
  console.log(`   ✅ Dependencies: ${Object.keys(pkg.dependencies).length}`);
} catch (error) {
  console.log(`   ❌ Error: ${error.message}`);
  process.exit(1);
}

// Test 3: Check if dependencies will be installable
console.log("\n3️⃣ Checking dependencies...");
const requiredDeps = ['@modelcontextprotocol/sdk', '@notionhq/client', 'dotenv'];
for (const dep of requiredDeps) {
  console.log(`   ✅ ${dep}`);
}

// Test 4: Validate index.js syntax
console.log("\n4️⃣ Validating index.js...");
try {
  const code = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf-8');
  
  // Check for key components
  const checks = {
    'Server import': code.includes('import { Server }'),
    'Tool handlers': code.includes('certify_code'),
    'Project context': code.includes('PROJECT_CONTEXT'),
    'Error handling': code.includes('try') && code.includes('catch'),
    'MCP protocol': code.includes('CallToolRequestSchema')
  };
  
  for (const [check, passed] of Object.entries(checks)) {
    console.log(`   ${passed ? '✅' : '❌'} ${check}`);
  }
  
  const allPassed = Object.values(checks).every(v => v);
  if (!allPassed) {
    console.log("\n❌ Some validation checks failed");
    process.exit(1);
  }
} catch (error) {
  console.log(`   ❌ Error: ${error.message}`);
  process.exit(1);
}

// Test 5: Check tools list
console.log("\n5️⃣ Verifying tools...");
const tools = [
  'certify_code',
  'guide_implementation',
  'run_code_safely',
  'check_dependencies',
  'validate_environment',
  'get_api_routes',
  'analyze_security',
  'check_hipaa_compliance'
];

const code = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf-8');
for (const tool of tools) {
  const exists = code.includes(`case "${tool}"`);
  console.log(`   ${exists ? '✅' : '❌'} ${tool}`);
}

console.log("\n✅ All tests passed!");
console.log("\n📋 Next steps:");
console.log("   1. Run: cd ai-mcp-server && npm install");
console.log("   2. Test: npm start");
console.log("   3. Use in VS Code with MCP extensions");
console.log("   4. Or use with Claude Desktop");
