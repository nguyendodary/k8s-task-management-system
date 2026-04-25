'use strict';

/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverageFrom: [
    'routes/**/*.js',
    'middleware/**/*.js',
    'config/**/*.js',
    '!node_modules/**',
  ],
  coverageReporters: ['text', 'lcov'],
  // 30 s timeout per test (DB/Redis can be slow in CI)
  testTimeout: 30000,
  // Avoid open handles when supertest keeps the server alive
  detectOpenHandles: true,
  forceExit: true,
};
