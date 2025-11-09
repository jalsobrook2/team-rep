// cypress/support/commands.js

// Custom commands for the freelance platform

// Login command
Cypress.Commands.add('login', (email = 'test@example.com', password = 'password123') => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/auth/login`,
    body: {
      email,
      password
    }
  }).then((response) => {
    // Store the token
    window.localStorage.setItem('authToken', response.body.token);
    window.localStorage.setItem('user', JSON.stringify(response.body.user));
  });
});

// Register command
Cypress.Commands.add('register', (userData = {}) => {
  const defaultUser = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123',
    skills: 'Web Development, Testing'
  };
  
  const user = { ...defaultUser, ...userData };
  
  cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/auth/register`,
    body: user
  }).then((response) => {
    // Store the token
    window.localStorage.setItem('authToken', response.body.token);
    window.localStorage.setItem('user', JSON.stringify(response.body.user));
  });
});

// Create gig command
Cypress.Commands.add('createGig', (gigData = {}) => {
  const defaultGig = {
    title: 'Test Gig - Web Development Service',
    description: 'I will create a professional website for your business with modern design and responsive layout.',
    price: 99.99,
    category: 'web-development',
    deliveryTime: 7,
    tags: ['web development', 'responsive design']
  };
  
  const gig = { ...defaultGig, ...gigData };
  
  cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/gigs`,
    body: gig,
    headers: {
      Authorization: `Bearer ${window.localStorage.getItem('authToken')}`
    }
  });
});

// Create order command
Cypress.Commands.add('createOrder', (gigId, requirements = 'Test order requirements') => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/orders`,
    body: {
      gig_id: gigId,
      requirements: requirements
    },
    headers: {
      Authorization: `Bearer ${window.localStorage.getItem('authToken')}`
    }
  });
});

// Clean up database command
Cypress.Commands.add('cleanupDb', () => {
  // Note: In a real scenario, you'd want to clean up test data
  // This is a placeholder for database cleanup
  cy.log('Cleaning up test data...');
});

// Wait for API response
Cypress.Commands.add('waitForApi', (alias) => {
  cy.wait(alias).then((interception) => {
    expect(interception.response.statusCode).to.be.oneOf([200, 201]);
  });
});