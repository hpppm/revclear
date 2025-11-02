# RevClear MCP Configuration

This setup integrates multiple MCP servers for complete project management.

## MCP Servers Configured

### 1. GitHub MCP Server (Official)
- **Purpose**: Direct GitHub integration for issues, PRs, repos
- **Repository**: https://github.com/github/github-mcp-server
- **Capabilities**:
  - Create and manage issues
  - Search code and repos
  - Manage pull requests
  - File operations
  - Repository management

### 2. RevClear Custom MCP (Our AI Assistant)
- **Purpose**: Project-specific AI help
- **Location**: `ai-mcp-server/`
- **Capabilities**:
  - Code certification (security + HIPAA)
  - Implementation guidance
  - Dependency checking
  - Safe code execution

### 3. File System MCP
- **Purpose**: Access project files
- **Capabilities**:
  - Read/write files
  - Directory navigation
  - File search

## Installation

### Step 1: Install GitHub CLI
```powershell
winget install GitHub.cli
```

### Step 2: Authenticate GitHub CLI
```powershell
gh auth login
```

### Step 3: Install MCP Servers
```powershell
cd ai-mcp-server
npm install

# GitHub MCP Server
npm install -g @modelcontextprotocol/server-github
```

### Step 4: Configure for Claude Desktop

Create/edit: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "your_github_token_here"
      }
    },
    "revclear-ai": {
      "command": "node",
      "args": ["C:\\Users\\hppm1\\OneDrive\\Documents\\GitHub\\revclear\\ai-mcp-server\\index.js"]
    },
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "C:\\Users\\hppm1\\OneDrive\\Documents\\GitHub\\revclear"
      ]
    }
  }
}
```

### Step 5: Get GitHub Token
1. Go to: https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select scopes:
   - ✅ repo (Full control)
   - ✅ workflow
   - ✅ read:org
   - ✅ read:user
4. Copy token and add to config above

## Usage with Claude Desktop

Once configured, restart Claude Desktop. You'll have access to:

### GitHub Operations
- `create_issue` - Create issues in your repo
- `search_repositories` - Search GitHub
- `get_file_contents` - Read files from GitHub
- `push_files` - Push changes
- `create_pull_request` - Create PRs

### RevClear AI Tools
- `certify_code` - Security & HIPAA certification
- `guide_implementation` - Step-by-step guides
- `run_code_safely` - Test code execution
- `check_dependencies` - Dependency status
- `validate_environment` - .env validation
- `get_api_routes` - List all API routes
- `analyze_security` - Security scan
- `check_hipaa_compliance` - HIPAA compliance check

### File System
- Read/write files directly
- Navigate project structure

## Usage with VS Code (GitHub Copilot)

VS Code already has GitHub integration through me! Use:
- `@workspace` for file questions
- Git commands in terminal
- GitHub Copilot Chat for AI help

## Examples

### Example 1: Create Issue from Code Review
```
1. Use analyze_security on a file
2. If issues found, use create_issue to track them
3. Assign to team member
```

### Example 2: Implement Feature
```
1. Use guide_implementation to get steps
2. Write code with GitHub Copilot
3. Use certify_code before committing
4. Create PR with create_pull_request
```

### Example 3: HIPAA Compliance Check
```
1. Use check_hipaa_compliance on files
2. Fix any issues
3. Use certify_code to verify
4. Document in Notion
```

## Benefits

✅ **Integrated Workflow**
- Code in VS Code with me (GitHub Copilot)
- Get deep analysis with Claude + MCP servers
- Manage GitHub directly

✅ **Automated Checks**
- Security analysis before commit
- HIPAA compliance verification
- Dependency validation

✅ **Team Collaboration**
- Create issues from code analysis
- Automated PR creation
- Track progress in GitHub

✅ **AI-Powered Development**
- Implementation guides
- Code certification
- Best practices enforcement

## Security Notes

⚠️ **Never commit**:
- GitHub tokens
- claude_desktop_config.json with tokens
- .env files

✅ **Always**:
- Use environment variables
- Rotate tokens regularly
- Review MCP server permissions
