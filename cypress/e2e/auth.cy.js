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
    cy.wait(800);
    cy.log('Switch to login tab');
    // Switch to Login tab manually (registration does not auto-login)
  cy.get('[data-testid="auth-tab-login"]').click();
    cy.log('Fill login fields');
    cy.get('[data-testid="auth-login-email"]').type(email);
    cy.get('[data-testid="auth-login-password"]').type(password);
    cy.log('Submit login');
    cy.get('[data-testid="auth-login-submit"]').click();
    cy.wait(800);
    cy.log('Assert dashboard visible');
    // Now should be on dashboard
    cy.get('[data-testid="dashboard-title"]').should('exist');
  });

  it('logs in with demo account using DemoLogin dropdown', () => {
    // Open Demo login menu
    cy.log('Open demo login dropdown');
    cy.contains('button', /demo login/i).click();
    cy.wait(200);
    // Choose Demo User
    cy.log('Select Demo User');
    cy.contains('.demo-item', /demo user/i).click();
    cy.wait(1200);
    cy.log('Verify dashboard');
    cy.get('[data-testid="dashboard-title"]').should('exist');
  });

  it('logs out successfully', () => {
    // First login via demo
    cy.log('Login via demo');
    cy.contains('button', /demo login/i).click();
    cy.contains('.demo-item', /demo user/i).click();
    cy.wait(1000);
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
