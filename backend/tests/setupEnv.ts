// Ensure Jest runs with the test environment flag so server.ts does not start listening.
process.env.NODE_ENV = "test";
// Avoid loading Genkit dev runtime during tests
process.env.GENKIT_ENV = "test";
// Silence DynamoDB test warnings by providing a placeholder table name
process.env.DYNAMODB_TEST_TABLE_NAME = process.env.DYNAMODB_TEST_TABLE_NAME || "jest-placeholder-table";
// Prevent server.ts from starting a listener in test runs
process.env.DISABLE_LISTEN = "true";
