#!/usr/bin/env node

/**
 * Script to run E2E tests with proper server lifecycle management
 * Works reliably on Windows without wmic.exe dependency
 */

const { spawn } = require('child_process');
const http = require('http');

let serverProcess = null;
let testsPassed = false;

// Function to wait for server to be ready
function waitForServer(url, timeout = 60000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const checkServer = () => {
      http.get(url, (res) => {
        if (res.statusCode === 200) {
          console.log('✓ Server is ready');
          resolve();
        } else {
          retry();
        }
      }).on('error', retry);
    };
    
    const retry = () => {
      if (Date.now() - startTime > timeout) {
        reject(new Error('Server failed to start within timeout'));
      } else {
        setTimeout(checkServer, 500);
      }
    };
    
    checkServer();
  });
}

// Function to start the server
function startServer() {
  return new Promise((resolve, reject) => {
    console.log('Starting server...');
    
    const isWindows = process.platform === 'win32';
    const npmCmd = isWindows ? 'npm.cmd' : 'npm';
    
    serverProcess = spawn(npmCmd, ['run', 'start:prod'], {
      stdio: 'inherit',
      shell: true
    });
    
    serverProcess.on('error', (err) => {
      console.error('Failed to start server:', err);
      reject(err);
    });
    
    // Give server a moment to start, then check if it's ready
    setTimeout(() => {
      waitForServer('http://localhost:3000')
        .then(resolve)
        .catch(reject);
    }, 2000);
  });
}

// Function to run Cypress tests
function runCypressTests() {
  return new Promise((resolve, reject) => {
    console.log('Running Cypress tests...');
    
    const isWindows = process.platform === 'win32';
    const npmCmd = isWindows ? 'npm.cmd' : 'npm';
    
    const cypressProcess = spawn(npmCmd, ['run', 'cypress:run'], {
      stdio: 'inherit',
      shell: true
    });
    
    cypressProcess.on('exit', (code) => {
      if (code === 0) {
        console.log('✓ Cypress tests passed');
        testsPassed = true;
        resolve();
      } else {
        console.error('✗ Cypress tests failed with code:', code);
        reject(new Error(`Cypress tests failed with exit code ${code}`));
      }
    });
    
    cypressProcess.on('error', (err) => {
      console.error('Failed to run Cypress:', err);
      reject(err);
    });
  });
}

// Function to stop the server
function stopServer() {
  if (serverProcess) {
    console.log('Stopping server...');
    
    if (process.platform === 'win32') {
      // On Windows, use taskkill to ensure process tree is killed
      spawn('taskkill', ['/pid', serverProcess.pid, '/f', '/t'], {
        stdio: 'ignore'
      });
    } else {
      serverProcess.kill('SIGTERM');
    }
    
    serverProcess = null;
  }
}

// Main execution
async function main() {
  try {
    // Start server
    await startServer();
    
    // Run tests
    await runCypressTests();
    
    // Cleanup
    stopServer();
    
    console.log('✓ E2E tests completed successfully');
    process.exit(0);
    
  } catch (error) {
    console.error('✗ E2E test run failed:', error.message);
    
    // Cleanup
    stopServer();
    
    process.exit(1);
  }
}

// Handle cleanup on exit
process.on('SIGINT', () => {
  console.log('\nReceived SIGINT, cleaning up...');
  stopServer();
  process.exit(testsPassed ? 0 : 1);
});

process.on('SIGTERM', () => {
  console.log('\nReceived SIGTERM, cleaning up...');
  stopServer();
  process.exit(testsPassed ? 0 : 1);
});

// Run the script
main();
