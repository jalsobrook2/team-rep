module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./tests/setup-docker.js'],
  testTimeout: 30000,
  collectCoverage: true,
  collectCoverageFrom: [
    'controllers/**/*.js',
    'middleware/**/*.js',
    'models/**/*.js',
    'routes/**/*.js',
    '!node_modules/**',
    '!tests/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html']
};