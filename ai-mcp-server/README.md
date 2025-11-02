# RevClear AI MCP Server

AI-powered Model Context Protocol server for RevClear project with code certification, implementation guidance, and safety checks.

## Features

### 🔒 Code Certification
Automatically checks code for:
- Security vulnerabilities
- HIPAA compliance
- Code quality issues
- Best practices

### 📚 Implementation Guides
Step-by-step instructions for:
- New API endpoints
- Frontend pages
- Database migrations
- Feature implementation

### 🛡️ Safety Checks
- Environment validation
- Dependency verification
- Security analysis
- HIPAA compliance checks

### 🚀 Safe Code Execution
Run and test code safely with validation

## Available Tools

### `certify_code`
**Purpose**: Comprehensive code certification

**Usage**:
```json
{
  "name": "certify_code",
  "arguments": {
    "filePath": "RevClear/backend/src/api/claims/index.ts"
  }
}
```

**Checks**:
- ✅ No hardcoded secrets
- ✅ Environment variables used properly
- ✅ PHI encryption
- ✅ Audit logging
- ✅ Error handling
- ✅ Input validation

---

### `guide_implementation`
**Purpose**: Get step-by-step implementation guide

**Usage**:
```json
{
  "name": "guide_implementation",
  "arguments": {
    "feature": "new claims API endpoint",
    "component": "backend"
  }
}
```

**Components**: `backend`, `frontend`, `demo`

---

### `run_code_safely`
**Purpose**: Execute code in safe environment

**Usage**:
```json
{
  "name": "run_code_safely",
  "arguments": {
    "code": "console.log('Hello')",
    "type": "test"
  }
}
```

**Types**: `test`, `script`, `validation`

---

### `check_dependencies`
**Purpose**: Check installed dependencies

**Usage**:
```json
{
  "name": "check_dependencies",
  "arguments": {
    "component": "backend"
  }
}
```

**Components**: `backend`, `frontend`, `all`

---

### `validate_environment`
**Purpose**: Validate .env configuration

**Usage**:
```json
{
  "name": "validate_environment",
  "arguments": {
    "component": "backend"
  }
}
```

---

### `get_api_routes`
**Purpose**: List all available API routes

**Usage**:
```json
{
  "name": "get_api_routes",
  "arguments": {}
}
```

---

### `analyze_security`
**Purpose**: Deep security analysis

**Usage**:
```json
{
  "name": "analyze_security",
  "arguments": {
    "filePath": "RevClear/backend/src/middleware/auth.ts"
  }
}
```

**Detects**:
- eval() usage
- innerHTML/XSS risks
- SQL injection
- Path traversal
- Insecure patterns

---

### `check_hipaa_compliance`
**Purpose**: HIPAA compliance verification

**Usage**:
```json
{
  "name": "check_hipaa_compliance",
  "arguments": {
    "filePath": "RevClear/backend/src/api/claims/index.ts"
  }
}
```

**Checks**:
- PHI encryption
- Audit logging
- Authentication
- Input validation

## Installation

```powershell
cd ai-mcp-server
npm install
```

## Testing

```powershell
npm test
```

## Running Standalone

```powershell
npm start
```

## Integration

### With Claude Desktop
Add to `%APPDATA%\Claude\claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "revclear-ai": {
      "command": "node",
      "args": ["C:\\path\\to\\ai-mcp-server\\index.js"]
    }
  }
}
```

### With VS Code
Already integrated via GitHub Copilot!

## Project Context

The server has built-in knowledge of:
- RevClear architecture
- Team structure and roles
- HIPAA requirements
- Security best practices
- Code patterns

## Example Workflow

1. **Before Coding**:
   ```
   Use: guide_implementation
   Get: Step-by-step instructions
   ```

2. **Write Code**:
   - Use GitHub Copilot in VS Code
   - Follow the guide

3. **Before Committing**:
   ```
   Use: certify_code
   Get: Security & HIPAA certification
   ```

4. **Fix Issues** (if any):
   ```
   Use: analyze_security
   Use: check_hipaa_compliance
   Get: Detailed analysis
   ```

5. **Validate**:
   ```
   Use: check_dependencies
   Use: validate_environment
   Get: Environment check
   ```

6. **Commit** ✅

## Security

This MCP server:
- ✅ Runs locally on your machine
- ✅ No data sent to external servers
- ✅ Only accesses your project files
- ✅ Safe code execution with validation

## Contributing

This is a project-specific MCP server. Customize for your needs!

## Support

Questions? Check:
- MCP_SETUP.md for full setup
- Create issue on GitHub
- Ask in team chat
