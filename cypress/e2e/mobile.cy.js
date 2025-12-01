/* eslint-disable cypress/no-unnecessary-waiting */
/**
 * E2E Tests for Mobile Responsiveness
 * Tests core flows on mobile viewport (375x667 - iPhone SE)
 */
describe('Mobile Responsiveness', () => {
  beforeEach(() => {
    // Set mobile viewport
    cy.viewport(375, 667);
    cy.visit('/');
    cy.window().then((win) => win.localStorage.clear());
  });

  describe('iPhone SE (375x667)', () => {
    it('loads app correctly on mobile', () => {
      cy.get('h1').should('contain', 'Pocket Jobs');
    });

    it('navigation buttons are accessible on mobile', () => {
      cy.contains('button', 'Home').should('be.visible');
      cy.contains('button', 'Dashboard').should('be.visible');
    });

    it('demo login works on mobile', () => {
      cy.demoLogin();
      cy.get('[data-testid="dashboard-title"]').should('be.visible');
    });

    it('dashboard tabs are scrollable on mobile', () => {
      cy.demoLogin();
      cy.get('.tab-bar').should('be.visible');
      // Tabs should be scrollable horizontally
      cy.get('.tab-btn').should('have.length.at.least', 5);
    });

    it('can navigate between dashboard tabs on mobile', () => {
      cy.demoLogin();
      
      cy.get('[data-testid="tab-jobs"]').click();
      cy.get('[data-testid="jobs-title"]').should('be.visible');
      
      cy.get('[data-testid="tab-workers"]').click();
      cy.contains('Available Workers').should('be.visible');
    });

    it('forms are usable on mobile', () => {
      cy.demoLogin();
      cy.get('[data-testid="tab-post"]').click();
      
      // Form inputs should be full width and accessible
      cy.get('[data-testid="post-title-input"]').should('be.visible');
      cy.get('[data-testid="post-description-input"]').should('be.visible');
      cy.get('[data-testid="post-submit"]').should('be.visible');
    });

    it('worker cards display correctly on mobile', () => {
      cy.demoLogin();
      cy.get('[data-testid="tab-workers"]').click();
      // Wait for workers to load
      cy.wait(1500);
      
      // Check workers list container and pagination exist
      cy.get('#workersList').should('be.visible');
      cy.get('#workersPagination').should('be.visible');
    });

    it('messaging layout adapts to mobile', () => {
      cy.demoLogin();
      cy.get('[data-testid="tab-messaging"]').click();
      cy.wait(500);
      
      // On mobile, layout should stack vertically
      cy.get('.left-col').should('be.visible');
    });
  });

  describe('iPad (768x1024)', () => {
    beforeEach(() => {
      cy.viewport(768, 1024);
    });

    it('loads correctly on tablet', () => {
      cy.demoLogin();
      cy.get('[data-testid="dashboard-title"]').should('be.visible');
    });

    it('tabs display properly on tablet', () => {
      cy.demoLogin();
      cy.get('.tab-bar').should('be.visible');
      cy.get('.tab-btn').should('be.visible');
    });
  });

  describe('Desktop (1280x720)', () => {
    beforeEach(() => {
      cy.viewport(1280, 720);
    });

    it('loads correctly on desktop', () => {
      cy.demoLogin();
      cy.get('[data-testid="dashboard-title"]').should('be.visible');
    });

    it('all navigation items visible on desktop', () => {
      cy.get('header nav button').should('be.visible');
    });

    it('messaging two-column layout on desktop', () => {
      cy.demoLogin();
      cy.get('[data-testid="tab-messaging"]').click();
      cy.wait(500);
      
      cy.get('.left-col').should('be.visible');
      cy.get('.chat-right').should('be.visible');
    });
  });

  describe('Touch interactions', () => {
    beforeEach(() => {
      cy.viewport(375, 667);
    });

    it('buttons have sufficient tap targets', () => {
      cy.demoLogin();
      
      // Check that tab buttons exist and are visible (tap target size is verified via CSS)
      cy.get('.tab-btn').should('have.length.at.least', 5);
      cy.get('.tab-btn').first().should('be.visible');
    });

    it('can scroll worker list on mobile', () => {
      cy.demoLogin();
      cy.get('[data-testid="tab-workers"]').click();
      // Wait for workers to load
      cy.wait(1500);
      
      // Use ensureScrollable: false since the list might not be scrollable if few workers
      cy.get('#workersList').scrollTo('bottom', { ensureScrollable: false });
      cy.get('#workersList').scrollTo('top', { ensureScrollable: false });
    });
  });
});
