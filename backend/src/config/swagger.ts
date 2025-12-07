import swaggerJsdoc from "swagger-jsdoc";
import { OpenAPIRegistry, OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";

// Create a registry to hold all our Zod-to-OpenAPI definitions
export const registry = new OpenAPIRegistry();

// Basic API definition
const options: swaggerJsdoc.Options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "RevClear Backend API",
            version: "1.0.0",
            description: "API documentation for RevClear backend services",
        },
        servers: [
            {
                url: "http://localhost:3005/api",
                description: "Local Development Server",
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    // Path to the API docs
    apis: ["./src/api/routes/*.ts"],
};

// We will use this generator to merge Zod definitions with the Swagger JSDoc
export const generateOpenApiSpec = () => {
    const generator = new OpenApiGeneratorV3(registry.definitions);
    const zodDocs = generator.generateComponents();

    // Initialize swagger-jsdoc
    const swaggerSpec = swaggerJsdoc(options);

    // Merge Zod components into the swagger spec
    if (!(swaggerSpec as any).components) {
        (swaggerSpec as any).components = {};
    }

    (swaggerSpec as any).components.schemas = {
        ...(swaggerSpec as any).components.schemas,
        ...zodDocs.components?.schemas,
    };

    return swaggerSpec;
};
