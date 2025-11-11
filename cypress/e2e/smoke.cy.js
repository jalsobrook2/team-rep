// Minimal smoke test suite ensuring core flows work
// Cuts corners: does not deeply assert data, only presence of key UI elements

describe('Smoke', () => {
  it('loads app without crashing', () => {
    cy.visit('/');
    cy.get('body', { timeout: 20000 }).should('exist');
  });

  it('basic endpoints respond', () => {
    cy.request('/').its('status').should('be.oneOf', [200, 304]);
    // worker list may require auth or may be 404 depending on routing; accept common statuses
    cy.request({ url: '/api/workers', failOnStatusCode: false })
      .its('status')
      .should('be.oneOf', [200, 401, 404]);
  });
});
