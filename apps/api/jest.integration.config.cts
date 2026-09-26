const baseConfig = require('./jest.config.cts');

module.exports = {
  ...baseConfig,
  displayName: 'api-integration',
  testMatch: ['<rootDir>/src/**/*.integration.spec.ts'],
  testPathIgnorePatterns: [],
  coverageDirectory: '../../coverage/apps/api-integration',
};
