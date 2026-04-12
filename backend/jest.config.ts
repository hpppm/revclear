import type { Config } from "@jest/types";

const config: Config.InitialOptions = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  modulePathIgnorePatterns: ["<rootDir>/dist"],
  clearMocks: true,
  setupFiles: ["<rootDir>/tests/setupEnv.ts"],
  globals: {
    "ts-jest": {
      tsconfig: "tsconfig.test.json",
    },
  },
};

export default config;
