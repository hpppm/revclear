// Ensure Jest runs with the test environment flag so server.ts does not start listening.
process.env.NODE_ENV = "test";
// Silence DynamoDB test warnings by providing a placeholder table name
process.env.DYNAMODB_TEST_TABLE_NAME = process.env.DYNAMODB_TEST_TABLE_NAME || "jest-placeholder-table";
// Prevent server.ts from starting a listener in test runs
process.env.DISABLE_LISTEN = "true";
// Provide placeholder DB config so appConfig validation passes in tests
process.env.DB_HOST = process.env.DB_HOST || "localhost";
process.env.DB_USERNAME = process.env.DB_USERNAME || "test";
process.env.DB_PASSWORD = process.env.DB_PASSWORD || "test";
process.env.DB_DATABASE = process.env.DB_DATABASE || "test";
