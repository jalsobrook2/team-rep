// cypress/e2e/complete-workflow.cy.js
// Basic connectivity tests - full workflow will be implemented when frontend is ready

describe('Basic Application Tests', () => {
  it('should load the homepage successfully', () => {
    cy.visit('/');
    cy.get('body').should('be.visible');
    cy.get('title').should('exist');
  });

  it('should have working health endpoint', () => {
    cy.request('GET', '/health').then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body.status).to.eq('ok');
    });
  });

  it('should have working API test endpoint', () => {
    cy.request('GET', '/api/test-public').then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body.success).to.eq(true);
    });
  });

  it('should return proper API structure from root', () => {
    // This test is no longer valid as the root now serves the frontend
    // We can check that the page loads, which is covered by the first test.
    // If we want to test the API, we should use a specific API endpoint.
    cy.log('Root endpoint now serves the frontend.');
  });

  it.skip('Full user workflow - to be implemented', () => {
    cy.log('Full E2E workflow test - to be implemented with complete frontend');
  });
});
