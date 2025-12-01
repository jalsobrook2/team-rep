// ***********************************************
// Custom commands for authentication and common actions
// ***********************************************

/**
 * Login command
 * @example cy.login('test@example.com', 'password123')
 */
Cypress.Commands.add('login', (email, password) => {
  cy.request({
    method: 'POST',
    url: '/api/auth/login',
    body: { email, password },
  }).then((response) => {
    expect(response.status).to.eq(200);
    const { accessToken } = response.body.data;
    window.localStorage.setItem('accessToken', accessToken);
  });
});

/**
 * Demo login command - uses API to login and sets tokens in localStorage
 * Then navigates to dashboard after page reload to ensure React picks up auth state
 * @example cy.demoLogin() // uses default demo@pocketjob.test
 * @example cy.demoLogin('alice@demo.test')
 */
Cypress.Commands.add('demoLogin', (email = 'demo@pocketjob.test') => {
  cy.request({
    method: 'POST',
    url: '/api/auth/demo-login',
    body: { email },
  }).then((response) => {
    expect(response.status).to.eq(200);
    const accessToken = response.body.accessToken || response.body.data?.accessToken;
    const refreshToken = response.body.refreshToken || response.body.data?.refreshToken;
    if (accessToken) window.localStorage.setItem('accessToken', accessToken);
    if (refreshToken) window.localStorage.setItem('refreshToken', refreshToken);
  });
  // Reload page so React picks up the token from localStorage
  cy.reload();
  // Wait for the Logout button to appear, confirming logged-in state
  cy.contains('button', /logout/i, { timeout: 10000 }).should('be.visible');
  // Navigate to dashboard
  cy.contains('button', /dashboard/i).click();
  // Wait for dashboard to load
  cy.get('[data-testid="dashboard-title"]', { timeout: 10000 }).should('be.visible');
});

/**
 * Signup command
 * @example cy.signup('Test User', 'test@example.com', 'password123', 'coding')
 */
Cypress.Commands.add('signup', (name, email, password, skills) => {
  return cy.request({
    method: 'POST',
    url: '/api/auth/signup',
    body: { name, email, password, skills },
  }).then((response) => {
    expect(response.status).to.eq(201);
    return response.body.data;
  });
});

/**
 * Logout command
 */
Cypress.Commands.add('logout', () => {
  window.localStorage.removeItem('accessToken');
  window.localStorage.removeItem('refreshToken');
});

/**
 * Create a job
 * @example cy.createJob('Test Job', 'Description', 'NYC', 100)
 */
Cypress.Commands.add('createJob', (title, description, location, offer) => {
  const token = window.localStorage.getItem('accessToken');
  return cy.request({
    method: 'POST',
    url: '/api/jobs',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: { title, description, location, offer },
  }).then((response) => {
    expect(response.status).to.eq(201);
    return response.body.data.job;
  });
});

/**
 * Clean up test data
 */
Cypress.Commands.add('cleanupTestData', () => {
  // This would ideally connect to a test API endpoint to clear test data
  cy.logout();
});
