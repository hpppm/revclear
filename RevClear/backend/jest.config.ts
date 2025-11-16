import type { Config } from "@jest/types";

const config: Config.InitialOptions = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  modulePathIgnorePatterns: ["<rootDir>/dist"],
  clearMocks: true,
};

export default config;
