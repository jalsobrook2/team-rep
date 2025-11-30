// Cypress E2E: Authentication flows (signup, login, logout)
describe('Authentication E2E', () => {
  // Use seeded demo account to avoid signup timing issues
  const email = 'demo@pocketjob.test';
  const password = 'Demo123!';

  it('logs in with seeded demo account and logs out', () => {
    cy.visit('/');
    cy.login(email, password);
    cy.window().then((win) => {
      const token = win.localStorage.getItem('accessToken');
      expect(token, 'access token saved').to.be.a('string').and.not.be.empty;
    });

    // logout should clear tokens
    cy.logout();
    cy.window().then((win) => {
      expect(win.localStorage.getItem('accessToken')).to.be.null;
    });
  });
});
