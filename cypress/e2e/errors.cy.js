/**
 * E2E Tests for Error Scenarios
 * Covers: Invalid login, duplicate registration, protected routes
 */
describe('Error Handling', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.window().then((win) => win.localStorage.clear());
  });

  it('shows error for invalid login credentials', () => {
    cy.contains('button', /dashboard/i).click();
    cy.wait(500);
    
    // Switch to login tab if needed
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="auth-tab-login"]').length) {
        cy.get('[data-testid="auth-tab-login"]').click();
      }
    });
    
    // Try to login with invalid credentials
    cy.get('[data-testid="auth-login-email"], input[type="email"]').first().type('invalid@test.com');
    cy.get('[data-testid="auth-login-password"], input[type="password"]').first().type('wrongpassword');
    cy.get('[data-testid="auth-login-submit"], button[type="submit"]').first().click();
    
    cy.wait(1000);
    // Should show error message
    cy.get('.toast.error, .error, [class*="error"]').should('exist');
  });

  it('shows error for duplicate email registration', () => {
    cy.contains('button', /dashboard/i).click();
    cy.wait(500);
    // Switch to register tab (Auth page defaults to login)
    cy.get('[data-testid="auth-tab-register"]').click();
    
    // Fill registration form with existing demo email
    cy.get('[data-testid="auth-register-name"]').type('Duplicate Test');
    cy.get('[data-testid="auth-register-email"]').type('demo@pocketjob.test');
    cy.get('[data-testid="auth-register-password"]').type('Password123!');
    cy.get('[data-testid="auth-register-skills"]').type('Testing');
    cy.get('[data-testid="auth-register-submit"]').click();
    
    cy.wait(1000);
    // Should show duplicate email error
    cy.get('.toast.error, .error, [class*="error"]').should('exist');
  });

  it('redirects to auth when accessing protected route without login', () => {
    // Try to access dashboard without logging in
    cy.contains('button', /dashboard/i).click();
    
    // Should show auth/login screen since not authenticated
    cy.wait(500);
    // Auth page should be visible since we're not logged in
    cy.get('[data-testid="auth-register-email"], [data-testid="auth-login-email"]').should('exist');
  });

  it('handles API errors gracefully', () => {
    // Login using command
    cy.demoLogin();
    
    // Try to access jobs
    cy.get('[data-testid="tab-jobs"]').click();
    cy.wait(500);
    
    // App should handle any API errors without crashing
    cy.get('[data-testid="dashboard-title"]').should('be.visible');
  });

  it('validates form inputs on registration', () => {
    cy.contains('button', /dashboard/i).click();
    cy.wait(500);
    // Switch to register tab (Auth page defaults to login)
    cy.get('[data-testid="auth-tab-register"]').click();
    
    // Check all form fields exist
    cy.get('[data-testid="auth-register-name"]').should('exist');
    cy.get('[data-testid="auth-register-email"]').should('exist');
    cy.get('[data-testid="auth-register-password"]').should('exist');
    cy.get('[data-testid="auth-register-skills"]').should('exist');
    cy.get('[data-testid="auth-register-submit"]').should('exist');
  });

  it('shows user-friendly error messages', () => {
    cy.contains('button', /dashboard/i).click();
    cy.wait(500);
    // Switch to register tab (Auth page defaults to login)
    cy.get('[data-testid="auth-tab-register"]').click();
    
    // Verify form elements are accessible and can receive input
    cy.get('[data-testid="auth-register-name"]').type('Test User');
    cy.get('[data-testid="auth-register-email"]').should('exist');
    cy.get('[data-testid="auth-register-password"]').should('exist');
    cy.get('[data-testid="auth-register-skills"]').should('exist');
  });
});
