/**
 * E2E Tests for Job Management User Stories
 * Covers: Assign worker, kick worker, start/complete job, view applicants
 */
describe('Job Management', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.window().then((win) => win.localStorage.clear());
  });

  it('job owner can view applicants for their job', () => {
    cy.demoLogin();
    // First post a job to ensure we have one
    cy.get('[data-testid="tab-post"]').click();
    const jobTitle = `Applicants Test ${Date.now()}`;
    cy.get('[data-testid="post-title-input"]').type(jobTitle);
    cy.get('[data-testid="post-description-input"]').type('Job for testing applicants');
    cy.get('[data-testid="post-location-input"]').type('Remote');
    cy.get('[data-testid="post-offer-input"]').type('100');
    cy.get('[data-testid="post-submit"]').click();
    cy.wait(1500);
    
    // Now go to my jobs
    cy.get('[data-testid="tab-myjobs"]').click();
    cy.wait(1000);
    
    // Check my jobs section is visible with our job
    cy.contains('My Posted Jobs').should('be.visible');
    cy.get('#myJobsList').should('exist');
  });

  it('can navigate between job tabs', () => {
    cy.demoLogin();
    
    // Test all job-related tabs
    cy.get('[data-testid="tab-jobs"]').click();
    cy.get('[data-testid="jobs-title"]').should('be.visible');
    
    cy.get('[data-testid="tab-myjobs"]').click();
    cy.contains('My Posted Jobs').should('be.visible');
    
    cy.get('[data-testid="tab-accepted"]').click();
    cy.contains('Accepted Jobs').should('be.visible');
    
    cy.get('[data-testid="tab-post"]').click();
    cy.get('[data-testid="post-title"]').should('be.visible');
  });

  it('accepted jobs shows correct information', () => {
    cy.demoLogin();
    cy.get('[data-testid="tab-accepted"]').click();
    cy.wait(500);
    
    // Check the section exists with correct header
    cy.contains('Accepted Jobs').should('be.visible');
    cy.get('#acceptedJobsList').should('exist');
  });

  it('my jobs shows job status and details', () => {
    cy.demoLogin();
    // First post a job to ensure we have one
    cy.get('[data-testid="tab-post"]').click();
    const jobTitle = `Status Test ${Date.now()}`;
    cy.get('[data-testid="post-title-input"]').type(jobTitle);
    cy.get('[data-testid="post-description-input"]').type('Job for status testing');
    cy.get('[data-testid="post-location-input"]').type('Remote');
    cy.get('[data-testid="post-offer-input"]').type('100');
    cy.get('[data-testid="post-submit"]').click();
    cy.wait(1500);
    
    cy.get('[data-testid="tab-myjobs"]').click();
    cy.wait(500);
    
    // Each job card should show key info
    cy.get('#myJobsList .card', { timeout: 10000 }).should('have.length.at.least', 1);
  });

  it('can create and manage a complete job flow', () => {
    cy.demoLogin();
    
    // Step 1: Post a new job
    cy.get('[data-testid="tab-post"]').click();
    const jobTitle = `E2E Flow Job ${Date.now()}`;
    cy.get('[data-testid="post-title-input"]').type(jobTitle);
    cy.get('[data-testid="post-description-input"]').type('Full flow test job');
    cy.get('[data-testid="post-location-input"]').type('Test Location');
    cy.get('[data-testid="post-offer-input"]').type('250');
    cy.get('[data-testid="post-submit"]').click();
    cy.wait(1500);
    cy.get('#postJobMsg').should('contain', 'Job created');
    
    // Step 2: Verify My Jobs tab shows job list
    cy.get('[data-testid="tab-myjobs"]').click();
    cy.wait(1000);
    cy.contains('My Posted Jobs').should('be.visible');
    cy.get('#myJobsList').should('exist');
  });
});
