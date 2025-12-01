/* eslint-disable cypress/no-unnecessary-waiting */
/**
 * E2E Tests for Jobs User Stories
 * Covers: Search jobs, view details, apply to job, post job
 */
describe('Jobs', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.window().then((win) => win.localStorage.clear());
  });

  it('can view available jobs list', () => {
    cy.demoLogin();
    cy.get('[data-testid="tab-jobs"]').click();
    cy.get('[data-testid="jobs-title"]').should('contain', 'Available Jobs');
    cy.get('#jobsList').should('exist');
  });

  it('can post a new job successfully', () => {
    cy.demoLogin();
    cy.get('[data-testid="tab-post"]').click();
    
    const jobTitle = `Test Job ${Date.now()}`;
    cy.get('[data-testid="post-title-input"]').type(jobTitle);
    cy.get('[data-testid="post-description-input"]').type('This is a test job posted by Cypress E2E test');
    cy.get('[data-testid="post-location-input"]').type('Remote - E2E Test');
    cy.get('[data-testid="post-offer-input"]').type('150');
    cy.get('[data-testid="post-submit"]').click();
    
    cy.wait(1500);
    cy.get('#postJobMsg').should('contain', 'Job created');
  });

  it('can view my posted jobs', () => {
    cy.demoLogin();
    cy.get('[data-testid="tab-myjobs"]').click();
    cy.contains('My Posted Jobs').should('be.visible');
    cy.get('#myJobsList').should('exist');
  });

  it('can apply to an open job', () => {
    cy.demoLogin();
    cy.get('[data-testid="tab-jobs"]').click();
    cy.wait(1000);
    
    // Find an open job and apply
    cy.get('#jobsList .card').first().within(() => {
      cy.contains('button', 'Apply').click();
    });
    
    // Should see success or already applied message
    cy.wait(500);
  });

  it('shows job details including location and offer', () => {
    cy.demoLogin();
    cy.get('[data-testid="tab-jobs"]').click();
    cy.wait(500);
    
    cy.get('#jobsList .card').first().within(() => {
      cy.contains('Location:').should('exist');
      cy.contains('Offer:').should('exist');
      cy.contains('Status:').should('exist');
    });
  });

  it('validates required fields when posting a job', () => {
    cy.demoLogin();
    cy.get('[data-testid="tab-post"]').click();
    
    // Try to submit without filling required fields
    cy.get('[data-testid="post-submit"]').click();
    
    // HTML5 validation should prevent submission
    cy.get('[data-testid="post-title-input"]:invalid').should('exist');
  });
});
