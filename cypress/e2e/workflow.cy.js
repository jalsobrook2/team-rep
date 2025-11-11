describe('Workflow', () => {
  function demoLogin(){
    cy.contains('button', /demo login/i).click();
    cy.contains('.demo-item', /demo user/i).click();
    cy.wait(1000);
  }

  it('registers then lands on dashboard', () => {
    cy.visit('/');
    cy.window().then((win) => win.localStorage.clear());
    cy.contains('button', /dashboard/i).click();
    cy.get('[data-testid="auth-register-name"]').type('Flow User');
    const email = `flow${Date.now()}@test.com`;
    cy.get('[data-testid="auth-register-email"]').type(email);
    cy.get('[data-testid="auth-register-password"]').type('Password123!');
    cy.get('[data-testid="auth-register-skills"]').type('Automation');
    cy.get('[data-testid="auth-register-submit"]').click();
    cy.wait(1200);
    cy.get('[data-testid="dashboard-title"]').should('exist');
  });

  it('login, post a job, then view jobs', () => {
    cy.visit('/');
    cy.window().then((win) => win.localStorage.clear());
    demoLogin();
    cy.get('[data-testid="tab-post"]').click();
    cy.get('[data-testid="post-title-input"]').type(`Workflow ${Date.now()}`);
    cy.get('[data-testid="post-description-input"]').type('E2E flow job');
    cy.get('[data-testid="post-location-input"]').type('Remote');
    cy.get('[data-testid="post-offer-input"]').type('200');
    cy.get('[data-testid="post-submit"]').click();
    cy.wait(1200);
    cy.get('[data-testid="tab-jobs"]').click();
    cy.get('[data-testid="jobs-title"]').should('exist');
  });
});
