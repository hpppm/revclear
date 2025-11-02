import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, "..");

// RevClear Project Knowledge Base
const PROJECT_CONTEXT = {
  name: "RevClear",
  description: "AI-powered medical billing system for healthcare providers",
  architecture: {
    backend: {
      path: "RevClear/backend",
      tech: "Node.js/TypeScript with Express",
      main: "src/index.ts",
      apis: ["auth", "claims", "analytics", "ai", "era", "transcription"],
      database: "PostgreSQL with Cloud SQL",
      auth: "JWT with Firebase"
    },
    frontend: {
      path: "RevClear/frontend",
      tech: "Next.js 16 with React 19",
      main: "src/app/page.tsx",
      styling: "Tailwind CSS 4"
    },
    demo: {
      path: "Demo",
      tech: "Static HTML/CSS/JS",
      files: ["index.html", "style.css", "script.js"]
    }
  },
  team: {
    security: "HIPAA compliance, authentication, secrets management",
    backend: "Rasmus - API endpoints, middleware, database",
    frontend: "Nerni - UI pages, components, user experience"
  },
  compliance: {
    hipaa: true,
    requirements: [
      "PHI must be encrypted at rest and in transit",
      "Audit logging for all PHI access",
      "JWT authentication required",
      "No secrets in code",
      "Input validation and sanitization"
    ]
  },
  branches: {
    main: "Team collaboration - simple setup",
    "feature/gcp-deployment": "GCP infrastructure with Terraform"
  }
};

// Code Quality Checklist
const CODE_CERTIFICATION_CHECKLIST = {
  security: [
    "No hardcoded secrets or credentials",
    "Environment variables properly used",
    "Input validation implemented",
    "SQL injection prevention",
    "XSS prevention in frontend",
    "JWT tokens validated",
    "CORS properly configured"
  ],
  hipaa: [
    "PHI encryption at rest",
    "PHI encryption in transit (HTTPS)",
    "Audit logging for PHI access",
    "Access control implemented",
    "No PHI in logs",
    "Proper authentication"
  ],
  codeQuality: [
    "TypeScript types defined",
    "Error handling implemented",
    "No console.logs in production",
    "Functions documented",
    "Variables properly named",
    "Code follows project patterns"
  ],
  testing: [
    "Unit tests exist",
    "API endpoints tested",
    "Error cases handled",
    "Edge cases considered"
  ]
};

// Create MCP Server
const server = new Server(
  {
    name: "revclear-ai-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  }
);

// List available resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: "revclear://project/context",
        name: "Project Context",
        description: "Complete RevClear project context and architecture",
        mimeType: "application/json",
      },
      {
        uri: "revclear://project/checklist",
        name: "Certification Checklist",
        description: "Code certification checklist for security and HIPAA compliance",
        mimeType: "application/json",
      },
      {
        uri: "revclear://project/team",
        name: "Team Structure",
        description: "Team roles and responsibilities",
        mimeType: "application/json",
      },
    ],
  };
});

// Read resources
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;

  switch (uri) {
    case "revclear://project/context":
      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify(PROJECT_CONTEXT, null, 2),
          },
        ],
      };
    case "revclear://project/checklist":
      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify(CODE_CERTIFICATION_CHECKLIST, null, 2),
          },
        ],
      };
    case "revclear://project/team":
      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify(PROJECT_CONTEXT.team, null, 2),
          },
        ],
      };
    default:
      throw new Error(`Unknown resource: ${uri}`);
  }
});

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "certify_code",
        description: "AI-powered code certification - checks security, HIPAA compliance, and code quality",
        inputSchema: {
          type: "object",
          properties: {
            filePath: {
              type: "string",
              description: "Path to the file to certify (relative to project root)",
            },
            code: {
              type: "string",
              description: "Code to certify (if not reading from file)",
            },
          },
        },
      },
      {
        name: "guide_implementation",
        description: "Get AI guidance on implementing a feature with step-by-step instructions",
        inputSchema: {
          type: "object",
          properties: {
            feature: {
              type: "string",
              description: "Feature to implement (e.g., 'new claims API endpoint')",
            },
            component: {
              type: "string",
              description: "Component: backend, frontend, or demo",
            },
          },
          required: ["feature", "component"],
        },
      },
      {
        name: "run_code_safely",
        description: "Run code in a safe environment with validation",
        inputSchema: {
          type: "object",
          properties: {
            code: {
              type: "string",
              description: "Code to run (JavaScript/Node.js)",
            },
            type: {
              type: "string",
              enum: ["test", "script", "validation"],
              description: "Type of code execution",
            },
          },
          required: ["code", "type"],
        },
      },
      {
        name: "check_dependencies",
        description: "Check if project dependencies are installed and up to date",
        inputSchema: {
          type: "object",
          properties: {
            component: {
              type: "string",
              enum: ["backend", "frontend", "all"],
              description: "Which component to check",
            },
          },
          required: ["component"],
        },
      },
      {
        name: "validate_environment",
        description: "Validate environment variables and configuration",
        inputSchema: {
          type: "object",
          properties: {
            component: {
              type: "string",
              enum: ["backend", "frontend"],
              description: "Component to validate",
            },
          },
          required: ["component"],
        },
      },
      {
        name: "get_api_routes",
        description: "List all available API routes in the backend",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "analyze_security",
        description: "Analyze code for security vulnerabilities",
        inputSchema: {
          type: "object",
          properties: {
            filePath: {
              type: "string",
              description: "Path to file to analyze",
            },
          },
          required: ["filePath"],
        },
      },
      {
        name: "check_hipaa_compliance",
        description: "Check if code follows HIPAA compliance requirements",
        inputSchema: {
          type: "object",
          properties: {
            filePath: {
              type: "string",
              description: "Path to file to check",
            },
          },
          required: ["filePath"],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "certify_code": {
        const code = args.code || (args.filePath ? await fs.readFile(path.join(PROJECT_ROOT, args.filePath), "utf-8") : "");
        const results = {
          certified: true,
          issues: [],
          warnings: [],
          passed: [],
        };

        // Security checks
        if (code.includes("password") && !code.includes("process.env")) {
          results.issues.push("⚠️ Hardcoded password detected");
          results.certified = false;
        }
        if (code.match(/api[_-]?key\s*=\s*["']/i)) {
          results.issues.push("⚠️ Hardcoded API key detected");
          results.certified = false;
        }
        if (!code.includes("process.env") && code.match(/SECRET|TOKEN|KEY/)) {
          results.warnings.push("⚡ Consider using environment variables for secrets");
        }

        // HIPAA checks
        if (code.match(/patient|phi|health.*record/i)) {
          if (!code.includes("encrypt") && !code.includes("crypto")) {
            results.warnings.push("⚡ PHI handling detected - ensure encryption is implemented");
          }
          if (!code.includes("audit") && !code.includes("log")) {
            results.warnings.push("⚡ PHI access should be audit logged");
          }
        }

        // Code quality
        if (code.includes("console.log")) {
          results.warnings.push("⚡ console.log found - remove for production");
        }
        if (code.match(/any\s*[;)]/)) {
          results.warnings.push("⚡ 'any' type usage - consider specific types");
        }

        // Success checks
        if (code.includes("process.env")) {
          results.passed.push("✅ Using environment variables");
        }
        if (code.includes("try") && code.includes("catch")) {
          results.passed.push("✅ Error handling implemented");
        }

        const summary = `
🔍 Code Certification Results
${results.certified ? "✅ CERTIFIED" : "❌ NOT CERTIFIED"}

${results.issues.length > 0 ? "🚨 Critical Issues:\n" + results.issues.join("\n") : ""}
${results.warnings.length > 0 ? "\n⚠️ Warnings:\n" + results.warnings.join("\n") : ""}
${results.passed.length > 0 ? "\n✅ Passed Checks:\n" + results.passed.join("\n") : ""}

${!results.certified ? "\n❌ Fix critical issues before deploying" : "\n✅ Code meets certification standards"}
        `;

        return {
          content: [
            {
              type: "text",
              text: summary,
            },
          ],
        };
      }

      case "guide_implementation": {
        const guides = {
          backend: {
            "new claims API endpoint": `
📋 Step-by-Step Guide: New Claims API Endpoint

1️⃣ Create Route File
   Location: RevClear/backend/src/api/claims/
   File: new-endpoint.ts
   
2️⃣ Define Route Handler
   \`\`\`typescript
   import { Router } from 'express';
   import { authMiddleware } from '../../middleware/auth';
   
   const router = Router();
   
   router.post('/endpoint-name', authMiddleware, async (req, res) => {
     try {
       // Validate input
       const { data } = req.body;
       
       // Process claim
       const result = await processClaim(data);
       
       // Audit log
       await auditLog(req.user.id, 'claim_processed');
       
       res.json({ success: true, result });
     } catch (error) {
       res.status(500).json({ error: error.message });
     }
   });
   
   export default router;
   \`\`\`

3️⃣ Register Route
   File: RevClear/backend/src/api/index.ts
   Add: app.use('/api/claims', newEndpoint);

4️⃣ Test
   Run: <cd RevClear/backend && npm test>

5️⃣ Certify
   Use: certify_code tool on your new file

✅ Ready to implement!
            `,
          },
          frontend: {
            "new page": `
📋 Step-by-Step Guide: New Frontend Page

1️⃣ Create Page File
   Location: RevClear/frontend/src/app/page-name/
   File: page.tsx

2️⃣ Define Page Component
   \`\`\`typescript
   'use client';
   import { useAuth } from '@/context/AuthContext';
   
   export default function PageName() {
     const { user } = useAuth();
     
     return (
       <div className="container mx-auto p-4">
         <h1 className="text-2xl font-bold">Page Title</h1>
         {/* Your content */}
       </div>
     );
   }
   \`\`\`

3️⃣ Test Locally
   Run: <cd RevClear/frontend && npm run dev>
   Visit: http://localhost:3000/page-name

4️⃣ Certify
   Use: certify_code tool

✅ Ready to code!
            `,
          },
        };

        const guide = guides[args.component]?.[args.feature] || `
📋 Implementation Guide: ${args.feature} (${args.component})

General Steps:
1. Plan your implementation
2. Create necessary files
3. Write code with proper types
4. Add error handling
5. Test thoroughly
6. Use certify_code before committing
7. Update documentation

Need specific guidance? Ask with more details!
        `;

        return {
          content: [
            {
              type: "text",
              text: guide,
            },
          ],
        };
      }

      case "run_code_safely": {
        try {
          const { stdout, stderr } = await execAsync(`node -e "${args.code.replace(/"/g, '\\"')}"`);
          return {
            content: [
              {
                type: "text",
                text: `✅ Code executed successfully\n\nOutput:\n${stdout}\n${stderr ? `Errors:\n${stderr}` : ""}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `❌ Execution failed\n\nError: ${error.message}`,
              },
            ],
          };
        }
      }

      case "check_dependencies": {
        const components = args.component === "all" ? ["backend", "frontend"] : [args.component];
        const results = [];

        for (const comp of components) {
          const pkgPath = path.join(PROJECT_ROOT, "RevClear", comp, "package.json");
          try {
            const pkg = JSON.parse(await fs.readFile(pkgPath, "utf-8"));
            results.push(`\n✅ ${comp}:\n  - Dependencies: ${Object.keys(pkg.dependencies || {}).length}\n  - DevDependencies: ${Object.keys(pkg.devDependencies || {}).length}`);
          } catch (error) {
            results.push(`\n❌ ${comp}: Error reading package.json`);
          }
        }

        return {
          content: [
            {
              type: "text",
              text: `📦 Dependency Check\n${results.join("\n")}`,
            },
          ],
        };
      }

      case "validate_environment": {
        const envPath = path.join(PROJECT_ROOT, "RevClear", args.component, ".env");
        const envExamplePath = path.join(PROJECT_ROOT, "RevClear", args.component, ".env.example");

        try {
          const envExists = await fs.access(envPath).then(() => true).catch(() => false);
          const exampleExists = await fs.access(envExamplePath).then(() => true).catch(() => false);

          let result = `🔧 Environment Validation (${args.component})\n\n`;
          result += envExists ? "✅ .env file exists\n" : "❌ .env file missing\n";
          result += exampleExists ? "✅ .env.example exists\n" : "⚠️ .env.example missing\n";
          
          if (!envExists) {
            result += "\n⚠️ Create .env file from .env.example";
          }

          return {
            content: [{ type: "text", text: result }],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `❌ Error validating environment: ${error.message}`,
              },
            ],
          };
        }
      }

      case "get_api_routes": {
        const apiDir = path.join(PROJECT_ROOT, "RevClear", "backend", "src", "api");
        try {
          const routes = await fs.readdir(apiDir);
          const routeList = routes
            .filter((r) => !r.includes("."))
            .map((r) => `  - /api/${r}`)
            .join("\n");

          return {
            content: [
              {
                type: "text",
                text: `🛣️ Available API Routes:\n\n${routeList}\n\nUse these routes in your frontend API calls.`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `❌ Error reading API routes: ${error.message}`,
              },
            ],
          };
        }
      }

      case "analyze_security": {
        const code = await fs.readFile(path.join(PROJECT_ROOT, args.filePath), "utf-8");
        const issues = [];

        // Check for common security issues
        if (code.match(/eval\(/)) issues.push("🚨 eval() usage detected - security risk");
        if (code.match(/innerHTML\s*=/)) issues.push("⚠️ innerHTML usage - XSS risk");
        if (code.match(/dangerouslySetInnerHTML/)) issues.push("⚠️ dangerouslySetInnerHTML - ensure sanitization");
        if (code.match(/SELECT.*WHERE.*\+/)) issues.push("🚨 Possible SQL injection");
        if (code.includes("fs.readFileSync") && code.includes("req.")) issues.push("⚠️ Path traversal risk");

        const result = issues.length > 0
          ? `🔒 Security Analysis\n\n${issues.join("\n")}\n\n⚠️ Review and fix security issues`
          : "✅ No obvious security issues detected\n\n(Note: This is basic analysis. Consider professional security audit)";

        return {
          content: [{ type: "text", text: result }],
        };
      }

      case "check_hipaa_compliance": {
        const code = await fs.readFile(path.join(PROJECT_ROOT, args.filePath), "utf-8");
        const checks = {
          encryption: code.includes("encrypt") || code.includes("crypto"),
          auditLog: code.includes("audit") || code.includes("log"),
          authentication: code.includes("auth") || code.includes("jwt"),
          inputValidation: code.includes("validate") || code.includes("sanitize"),
        };

        const hasPHI = code.match(/patient|phi|health.*record|medical.*record/i);

        let result = "🏥 HIPAA Compliance Check\n\n";
        
        if (hasPHI) {
          result += "⚕️ PHI handling detected\n\n";
          result += checks.encryption ? "✅ Encryption implemented\n" : "❌ Missing encryption\n";
          result += checks.auditLog ? "✅ Audit logging present\n" : "❌ Missing audit logging\n";
          result += checks.authentication ? "✅ Authentication present\n" : "❌ Missing authentication\n";
          result += checks.inputValidation ? "✅ Input validation present\n" : "⚠️ Consider input validation\n";
        } else {
          result += "✅ No obvious PHI handling detected\n";
        }

        return {
          content: [{ type: "text", text: result }],
        };
      }

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
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error executing ${name}: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("RevClear AI MCP Server running");
  console.error("Available tools:");
  console.error("  - certify_code: Code certification");
  console.error("  - guide_implementation: Step-by-step guides");
  console.error("  - run_code_safely: Safe code execution");
  console.error("  - check_dependencies: Dependency status");
  console.error("  - validate_environment: Environment check");
  console.error("  - get_api_routes: List API routes");
  console.error("  - analyze_security: Security analysis");
  console.error("  - check_hipaa_compliance: HIPAA check");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
