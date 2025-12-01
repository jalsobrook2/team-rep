/* eslint-disable cypress/no-unnecessary-waiting */
describe('Authentication', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.window().then((win) => win.localStorage.clear());
  });

  it('registers new user then logs in', () => {
    const email = `user${Date.now()}@test.com`;
    const password = 'Password123!';
    cy.log('Navigating to dashboard (should redirect to auth)');
    // Navigate to auth tab via header Dashboard button when not logged in
    cy.contains('button', /dashboard/i).click();
    cy.wait(300);
    cy.log('Click register tab');
    // Switch to Register mode
    cy.get('[data-testid="auth-tab-register"]').click();
    cy.wait(150);
    // Fill registration form
    cy.log('Fill registration fields');
    cy.get('[data-testid="auth-register-name"]').type('Test User');
    cy.get('[data-testid="auth-register-email"]').type(email);
    cy.get('[data-testid="auth-register-password"]').type(password);
    cy.get('[data-testid="auth-register-skills"]').type('Testing, Cypress');
    cy.log('Submit registration');
    cy.get('[data-testid="auth-register-submit"]').click();
    // Wait for registration to complete - look for success toast
    cy.wait(1500);
    cy.log('Switch to login tab');
    // Switch to Login tab manually (registration does not auto-login)
    cy.get('[data-testid="auth-tab-login"]').click();
    cy.log('Fill login fields');
    cy.get('[data-testid="auth-login-email"]').type(email);
    cy.get('[data-testid="auth-login-password"]').type(password);
    cy.log('Submit login');
    cy.get('[data-testid="auth-login-submit"]').click();
    // Wait for login to complete - Logout button appears when logged in
    cy.contains('button', /logout/i, { timeout: 10000 }).should('be.visible');
    cy.log('Click Dashboard to navigate');
    // Explicitly navigate to dashboard after login
    cy.contains('button', /dashboard/i).click();
    cy.log('Assert dashboard visible');
    // Now should be on dashboard
    cy.get('[data-testid="dashboard-title"]', { timeout: 10000 }).should('exist');
  });

  it('logs in with demo account using DemoLogin dropdown', () => {
    // Use the demoLogin custom command
    cy.demoLogin();
    cy.get('[data-testid="dashboard-title"]').should('exist');
  });

  it('logs out successfully', () => {
    // Use demoLogin command
    cy.demoLogin();
    cy.log('Click logout');
    cy.contains('button', /logout/i).click();
    cy.wait(500);
    cy.log('Navigate to dashboard expecting auth');
    cy.contains('button', /dashboard/i).click();
    // Should be redirected to auth since logged out
    cy.log('Assert auth login form visible');
    cy.get('[data-testid="auth-login-email"]').should('exist');
  });
});
