# CI/CD Pipeline Documentation

## Overview

This project has a comprehensive CI/CD pipeline that automatically runs on Pull Requests to ensure code quality and functionality.

## Pipeline Components

### 1. **Linting (ESLint)** ✅
- **Purpose**: Enforce code quality and consistency
- **Runs**: On every PR and push to main/newMain
- **Configuration**: `.eslintrc.js`
- **Command**: `npm run lint`

#### What It Checks:
- JavaScript/JSX syntax errors
- Code style consistency
- React best practices
- Unused variables and imports

#### Run Locally:
```bash
# Check for linting errors
npm run lint

# Auto-fix linting issues
npm run lint:fix
```

---

### 2. **Unit Tests (Jest)** ✅
- **Purpose**: Test individual components and API endpoints
- **Runs**: After linting passes
- **Test Files**: `tests/*.test.js`
- **Command**: `npm test`

#### Test Coverage:
- **78 total tests** across all suites
- Authentication flows (signup, login, logout, refresh tokens)
- Job CRUD operations
- Worker CRUD operations
- Job workflow actions (apply, assign, kick, unassign-self)
- Messaging integration
- Authorization and permissions

#### Test Suites:
- `auth.test.js` - Authentication (25+ tests)
- `jobActions.test.js` - Job actions (16 tests)
- `jobsCrud.test.js` - Jobs CRUD (14 tests)
- `workersCrud.test.js` - Workers CRUD (21 tests)
- `jobLifecycle.test.js` - Job lifecycle workflows
- `acceptance.test.js` - Multi-user acceptance flows
- `messages.integration.test.js` - Messaging features

#### Run Locally:
```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Watch mode for development
npm run test:watch

# Run specific test file
npm test -- auth.test.js
```

---

### 3. **E2E Tests (Cypress)** ✅
- **Purpose**: Test full user workflows and interactions
- **Runs**: After unit tests pass
- **Test Files**: `cypress/e2e/*.cy.js`
- **Command**: `npm run cypress:run`

#### Test Scenarios:
- **Authentication Flow** (`auth.cy.js`)
  - User registration with validation
  - Login with valid/invalid credentials
  - Logout functionality
  - Protected route access

- **Job Management** (`jobs.cy.js`)
  - Create new job postings
  - View all jobs
  - Update job details (owner only)
  - Delete jobs (owner only)

- **Application Workflow** (`workflow.cy.js`)
  - Worker applies to jobs
  - Owner assigns workers
  - Worker leaves assigned job
  - Job status transitions

#### Run Locally:
```bash
# Open Cypress Test Runner (interactive)
npm run cypress

# Run all E2E tests (headless)
npm run cypress:run

# Run E2E tests with server start
npm run test:e2e
```

---

### 4. **Build Check** ✅
- **Purpose**: Verify frontend builds successfully
- **Runs**: After linting and unit tests
- **Command**: `npm run client:build`

---

## GitHub Actions Workflow

### Workflow File: `.github/workflows/ci.yml`

### Trigger Events:
- **Pull Requests** to `main`, `newMain`, or `develop`
- **Push** to `main` or `newMain`

### Job Sequence:
```
1. Lint Code (ESLint)
   ↓
2. Unit Tests (Jest) ← requires MongoDB service
   ↓
3. E2E Tests (Cypress) ← requires MongoDB service + running server
   ↓
4. Build Check (Vite)
   ↓
5. PR Status Check (ensures all passed)
```

### Environment Requirements:
- **Node.js**: 18.x
- **MongoDB**: 7.0 (provided as service)
- **Environment Variables**:
  - `NODE_ENV=test`
  - `MONGODB_URI_TEST=mongodb://localhost:27017/backend-example-test`
  - `JWT_SECRET` (set in CI)
  - `JWT_REFRESH_SECRET` (set in CI)

---

## Local Development Setup

### Initial Setup:
```bash
# Install all dependencies (including dev dependencies)
npm install

# Install Cypress binary (if needed)
npx cypress install
```

### Before Creating a PR:
```bash
# Run all checks locally
npm run test:all

# This runs:
# 1. ESLint
# 2. Jest with coverage
# 3. Cypress E2E tests
```

### Quick Checks:
```bash
# Lint only
npm run lint

# Tests only
npm test

# E2E only (requires server running)
npm run cypress:run
```

---

## CircleCI Integration

### Workflow File: `.circleci/config.yml`

The project also includes CircleCI configuration for alternative CI/CD:
- MongoDB service container
- Test coverage reporting
- Coverage artifacts storage

---

## Artifacts and Reports

### Test Coverage Report:
- Generated after unit tests
- Location: `coverage/`
- Includes: HTML report, lcov.info, junit.xml
- Uploaded to: Codecov (optional)

### Cypress Artifacts:
- **Videos**: Full test run recordings
- **Screenshots**: Captured on test failures
- **Location**: `cypress/videos/`, `cypress/screenshots/`

---

## Status Badges

Add these to your README.md:

```markdown
![CI Pipeline](https://github.com/jalsobrook2/team-rep/workflows/CI%2FCD%20Pipeline/badge.svg)
[![codecov](https://codecov.io/gh/jalsobrook2/team-rep/branch/main/graph/badge.svg)](https://codecov.io/gh/jalsobrook2/team-rep)
```

---

## Troubleshooting

### Linting Fails:
```bash
# See specific errors
npm run lint

# Auto-fix most issues
npm run lint:fix
```

### Unit Tests Fail:
```bash
# Run specific test file
npm test -- <test-file-name>

# Run with verbose output
npm test -- --verbose
```

### Cypress Tests Fail:
```bash
# Open Cypress UI to debug
npm run cypress

# Check screenshots/videos in cypress/ folder
```

### MongoDB Connection Issues:
- Ensure MongoDB is running locally or use MongoDB Memory Server
- Check `MONGODB_URI_TEST` environment variable

---

## Configuration Files

| File | Purpose |
|------|---------|
| `.github/workflows/ci.yml` | GitHub Actions workflow |
| `.eslintrc.js` | ESLint configuration |
| `.eslintignore` | Files to skip linting |
| `jest.config.js` | Jest test configuration |
| `cypress.config.js` | Cypress E2E configuration |
| `.circleci/config.yml` | CircleCI workflow (alternative) |

---

## Best Practices

### Before Committing:
1. ✅ Run `npm run lint:fix`
2. ✅ Run `npm test`
3. ✅ Ensure all tests pass
4. ✅ Add tests for new features

### Writing Tests:
- **Unit Tests**: Test individual functions/components
- **E2E Tests**: Test complete user workflows
- **Coverage**: Aim for >70% coverage
- **Descriptive Names**: Use clear test descriptions

### Pull Request Guidelines:
1. All CI checks must pass ✅
2. Add tests for new features
3. Update documentation if needed
4. Keep PRs focused and small
5. Write descriptive PR descriptions

---

## Commands Reference

```bash
# Development
npm run dev                 # Start dev server + client
npm run dev:server         # Backend only
npm run dev:client         # Frontend only

# Testing
npm test                   # Run unit tests
npm run test:coverage      # Unit tests with coverage
npm run test:watch         # Watch mode
npm run cypress            # Open Cypress UI
npm run cypress:run        # Run Cypress headless
npm run test:e2e          # E2E with server start
npm run test:all          # All tests (lint + unit + e2e)

# Code Quality
npm run lint              # Check linting
npm run lint:fix          # Fix linting issues

# Build
npm run client:build      # Build production frontend
npm start                 # Start production server
```

---

## CI/CD Success Criteria

A PR is ready to merge when:
- ✅ All lint checks pass
- ✅ All unit tests pass (78/78)
- ✅ All E2E tests pass
- ✅ Build completes successfully
- ✅ Code coverage maintained
- ✅ No new warnings or errors

---

## Additional Resources

- [Jest Documentation](https://jestjs.io/)
- [Cypress Documentation](https://docs.cypress.io/)
- [ESLint Documentation](https://eslint.org/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
