# RevClear MCP Server

This MCP server provides project context to AI assistants (ChatGPT, Claude, etc.)

## What It Does

Gives AI assistants access to:
- Project architecture and team structure
- Documentation files
- Available API routes
- Security guidelines

## Setup for ChatGPT

1. Install dependencies:
```
cd mcp-server
npm install
```

2. Test it works:
```
npm start
```

3. Configure in ChatGPT (when they support MCP):
   - Point to this server
   - Now ChatGPT knows our project context!

## Available Tools

- `get_project_context` - Overview of RevClear
- `read_documentation` - Read any doc file
- `list_api_routes` - See all backend routes
- `get_security_guidelines` - Security rules

## For VS Code (GitHub Copilot)

I already have context from your workspace, but you can share this with your team so their AI tools understand the project too!
