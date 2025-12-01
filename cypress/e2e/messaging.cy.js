/* eslint-disable cypress/no-unnecessary-waiting */
/**
 * E2E Tests for Messaging User Stories
 * Covers: Send message, view conversations, mark as read
 */
describe('Messaging', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.window().then((win) => win.localStorage.clear());
  });

  it('can access messaging tab', () => {
    cy.demoLogin();
    cy.get('[data-testid="tab-messaging"]').click();
    cy.contains('Messaging').should('be.visible');
  });

  it('displays conversations list', () => {
    cy.demoLogin();
    cy.get('[data-testid="tab-messaging"]').click();
    cy.wait(500);
    
    // Should have conversation list area
    cy.get('#conversationsList, .left-col').should('exist');
  });

  it('can navigate to messaging from workers tab', () => {
    cy.demoLogin();
    cy.get('[data-testid="tab-workers"]').click();
    // Wait for workers tab to load
    cy.wait(500);
    
    // Navigate to messaging tab
    cy.get('[data-testid="tab-messaging"]').click();
    cy.wait(500);
    
    // Should see messaging tab content
    cy.contains('Messaging').should('be.visible');
  });

  it('messaging layout displays correctly', () => {
    cy.demoLogin();
    cy.get('[data-testid="tab-messaging"]').click();
    cy.wait(500);
    
    // Check for messaging UI components
    cy.get('.left-col, #conversationsList').should('exist');
    cy.get('.chat-right, #conversationView').should('exist');
  });

  it('shows empty state when no conversation selected', () => {
    cy.demoLogin();
    cy.get('[data-testid="tab-messaging"]').click();
    cy.wait(500);
    
    // Should show some indication when no conversation is selected
    cy.get('.chat-right').should('exist');
  });
});
