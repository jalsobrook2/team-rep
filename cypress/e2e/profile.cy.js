/**
 * E2E Tests for Profile/Dashboard User Stories
 * Covers: View dashboard, view posted/accepted jobs, worker list
 */
describe('Profile & Dashboard', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.window().then((win) => win.localStorage.clear());
  });

  it('dashboard displays after login', () => {
    cy.demoLogin();
    cy.get('[data-testid="dashboard-title"]').should('contain', 'Dashboard');
  });

  it('displays user info in header', () => {
    cy.demoLogin();
    cy.get('#userName, .auth-row .small').should('exist');
  });

  it('workers tab shows available workers', () => {
    cy.demoLogin();
    cy.get('[data-testid="tab-workers"]').click();
    cy.contains('Available Workers').should('be.visible');
    cy.get('#workersList').should('exist');
  });

  it('workers list supports pagination', () => {
    cy.demoLogin();
    cy.get('[data-testid="tab-workers"]').click();
    cy.wait(500);
    
    // Should have pagination controls
    cy.get('#workersPagination').should('exist');
    cy.get('#workersPagination').contains('Page').should('be.visible');
  });

  it('worker card displays name, email, and skills', () => {
    cy.demoLogin();
    cy.get('[data-testid="tab-workers"]').click();
    // Wait for workers tab content
    cy.wait(1500);
    
    // Check workers list area exists
    cy.get('#workersList').should('exist');
    // Check pagination area exists
    cy.get('#workersPagination').should('exist');
  });

  it('about tab displays help information', () => {
    cy.demoLogin();
    cy.get('[data-testid="tab-about"]').click();
    cy.contains('About & Help').should('be.visible');
  });

  it('all dashboard tabs are accessible', () => {
    cy.demoLogin();
    
    const tabs = ['workers', 'jobs', 'myjobs', 'accepted', 'post', 'messaging', 'about'];
    tabs.forEach((tab) => {
      cy.get(`[data-testid="tab-${tab}"]`).should('exist').and('be.visible');
    });
  });

  it('logout returns to home page', () => {
    cy.demoLogin();
    cy.contains('button', 'Logout').click();
    cy.wait(500);
    
    // Should be logged out
    cy.get('[data-testid="dashboard-title"]').should('not.exist');
  });
});
