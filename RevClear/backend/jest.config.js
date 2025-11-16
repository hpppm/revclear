"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config = {
    preset: "ts-jest",
    testEnvironment: "node",
    roots: ["<rootDir>/tests"],
    modulePathIgnorePatterns: ["<rootDir>/dist"],
    clearMocks: true,
};
exports.default = config;
