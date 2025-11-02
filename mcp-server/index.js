import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "fs/promises";
import path from "path";

const PROJECT_ROOT = path.join(process.cwd(), "..");

// Project context and documentation
const PROJECT_CONTEXT = {
  name: "RevClear",
  description: "AI-powered medical billing system for healthcare providers",
  architecture: {
    backend: "Node.js/TypeScript with Express, handles API and data processing",
    frontend: "Next.js/React, user interface",
    demo: "Static HTML/CSS/JS demo website"
  },
  team: {
    security: "Handles compliance, HIPAA, security policies, authentication reviews",
    backend: "Rasmus - API endpoints, middleware, database, business logic",
    frontend: "Nerni - UI pages, components, API integration, user experience"
  },
  branches: {
    main: "Team collaboration branch - simple, ready for development",
    "feature/gcp-deployment": "Advanced GCP infrastructure with Terraform (solo work)"
  },
  workflow: "Pull before push, commit often, test locally, communicate changes"
};

const server = new Server(
  {
    name: "revclear-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_project_context",
        description: "Get overall RevClear project context, architecture, and team structure",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "read_documentation",
        description: "Read project documentation files",
        inputSchema: {
          type: "object",
          properties: {
            filename: {
              type: "string",
              description: "Documentation filename (README.md, TEAM_GUIDE.md, etc.)",
            },
          },
          required: ["filename"],
        },
      },
      {
        name: "list_api_routes",
        description: "List all backend API routes available",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get_security_guidelines",
        description: "Get security and HIPAA compliance guidelines",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "get_project_context":
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(PROJECT_CONTEXT, null, 2),
          },
        ],
      };

    case "read_documentation":
      try {
        const filePath = path.join(PROJECT_ROOT, args.filename);
        const content = await fs.readFile(filePath, "utf-8");
        return {
          content: [
            {
              type: "text",
              text: content,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error reading ${args.filename}: ${error.message}`,
            },
          ],
          isError: true,
        };
      }

    case "list_api_routes":
      try {
        const apiDir = path.join(PROJECT_ROOT, "RevClear", "backend", "src", "api");
        const routes = await fs.readdir(apiDir);
        const routeInfo = await Promise.all(
          routes.map(async (route) => {
            const routePath = path.join(apiDir, route);
            const stat = await fs.stat(routePath);
            return stat.isDirectory() ? route : null;
          })
        );
        const validRoutes = routeInfo.filter(Boolean);
        return {
          content: [
            {
              type: "text",
              text: `Available API routes:\n${validRoutes.map(r => `- /api/${r}`).join("\n")}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error listing routes: ${error.message}`,
            },
          ],
          isError: true,
        };
      }

    case "get_security_guidelines":
      return {
        content: [
          {
            type: "text",
            text: `RevClear Security Guidelines:
            
1. HIPAA Compliance - All PHI must be encrypted at rest and in transit
2. Authentication - Use JWT tokens, validate on every API call
3. No Secrets in Code - Use .env files, never commit credentials
4. Input Validation - Sanitize all user inputs to prevent injection
5. Audit Logging - Log all access to sensitive data
6. Code Review - Security team reviews auth and data handling code
7. Branch Protection - main branch requires pull requests
8. Environment Separation - dev/staging/prod environments isolated

Contact security team before handling PHI or auth changes.`,
          },
        ],
      };

    default:
      return {
        content: [
          {
            type: "text",
            text: `Unknown tool: ${name}`,
          },
        ],
        isError: true,
      };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("RevClear MCP server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
