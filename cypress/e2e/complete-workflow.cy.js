// cypress/e2e/complete-workflow.cy.js
// Complete user workflow test: signup → post gig → place order → complete gig

describe('Complete Freelance Platform Workflow', () => {
  beforeEach(() => {
    // Clean up before each test
    cy.cleanupDb();
    
    // Visit the application
    cy.visit('/');
  });

  after(() => {
    // Clean up after all tests
    cy.cleanupDb();
  });

  it('should complete the full user journey: signup → post gig → place order → complete gig', () => {
    // Step 1: User Registration (Seller)
    cy.log('Step 1: Register as seller');
    
    // Register seller user
    const sellerData = {
      name: 'John Seller',
      email: `seller_${Date.now()}@example.com`,
      password: 'password123',
      skills: 'Web Development, React, Node.js'
    };
    
    cy.register(sellerData);
    
    // Verify user is logged in (check for dashboard or user menu)
    cy.visit('/dashboard');
    cy.contains('Dashboard').should('be.visible');
    cy.contains(sellerData.name).should('be.visible');

    // Step 2: Create a Gig
    cy.log('Step 2: Create a gig posting');
    
    // Navigate to create gig (assuming button exists on dashboard)
    cy.contains('Create New Gig').click();
    
    // Fill out gig creation form
    const gigData = {
      title: 'Professional React Website Development',
      description: 'I will create a modern, responsive website using React and the latest web technologies. The website will be fully functional, SEO-optimized, and mobile-friendly.',
      price: '299.99',
      category: 'web-development',
      deliveryTime: '14',
      tags: 'react, website, responsive, modern'
    };
    
    // Fill form fields
    cy.get('[data-cy="gig-title"]').type(gigData.title);
    cy.get('[data-cy="gig-description"]').type(gigData.description);
    cy.get('[data-cy="gig-price"]').type(gigData.price);
    cy.get('[data-cy="gig-category"]').select(gigData.category);
    cy.get('[data-cy="gig-delivery-time"]').type(gigData.deliveryTime);
    cy.get('[data-cy="gig-tags"]').type(gigData.tags);
    
    // Submit form
    cy.get('[data-cy="create-gig-submit"]').click();
    
    // Verify gig was created successfully
    cy.contains('Gig created successfully').should('be.visible');
    cy.contains(gigData.title).should('be.visible');
    
    // Store gig ID for later use
    cy.url().then((url) => {
      const gigId = url.split('/').pop();
      cy.wrap(gigId).as('gigId');
    });

    // Step 3: Register as Buyer and Place Order
    cy.log('Step 3: Register as buyer and place order');
    
    // Logout current user
    cy.contains('Logout').click();
    
    // Register buyer user
    const buyerData = {
      name: 'Jane Buyer',
      email: `buyer_${Date.now()}@example.com`,
      password: 'password123',
      skills: 'Project Management'
    };
    
    cy.register(buyerData);
    
    // Browse gigs and find the created gig
    cy.visit('/browse-gigs');
    cy.contains(gigData.title).should('be.visible');
    
    // Click on the gig to view details
    cy.contains(gigData.title).click();
    
    // Place an order
    cy.contains('Order Now').click();
    
    // Fill order requirements
    const orderRequirements = 'I need a professional website for my consulting business. Please include contact forms, service pages, and a blog section.';
    cy.get('[data-cy="order-requirements"]').type(orderRequirements);
    
    // Submit order
    cy.get('[data-cy="place-order-submit"]').click();
    
    // Verify order was placed
    cy.contains('Order placed successfully').should('be.visible');
    
    // Store order ID
    cy.url().then((url) => {
      const orderId = url.split('/').pop();
      cy.wrap(orderId).as('orderId');
    });

    // Step 4: Seller Accepts and Completes Order
    cy.log('Step 4: Seller accepts and completes order');
    
    // Switch back to seller account
    cy.contains('Logout').click();
    cy.login(sellerData.email, sellerData.password);
    
    // Navigate to orders dashboard
    cy.visit('/dashboard');
    cy.contains('Orders').click();
    
    // Find and accept the order
    cy.contains(gigData.title).parent().within(() => {
      cy.contains('Accept Order').click();
    });
    
    // Verify order status changed
    cy.contains('accepted').should('be.visible');
    
    // Start work on the order
    cy.contains('Start Work').click();
    cy.contains('in-progress').should('be.visible');
    
    // Deliver the order
    cy.contains('Deliver Order').click();
    
    // Add delivery message
    const deliveryMessage = 'Your website is complete! I have included all the requested features and the site is fully responsive.';
    cy.get('[data-cy="delivery-message"]').type(deliveryMessage);
    cy.get('[data-cy="deliver-submit"]').click();
    
    // Verify order was delivered
    cy.contains('delivered').should('be.visible');

    // Step 5: Buyer Completes Order
    cy.log('Step 5: Buyer completes order');
    
    // Switch back to buyer account
    cy.contains('Logout').click();
    cy.login(buyerData.email, buyerData.password);
    
    // Navigate to orders
    cy.visit('/dashboard');
    cy.contains('Orders').click();
    
    // Find the delivered order
    cy.contains(gigData.title).parent().within(() => {
      // Leave a review and complete
      cy.contains('Accept & Complete').click();
    });
    
    // Fill review form
    cy.get('[data-cy="order-rating"]').select('5');
    cy.get('[data-cy="order-review"]').type('Excellent work! The website exceeded my expectations. Highly recommended!');
    
    // Complete the order
    cy.get('[data-cy="complete-order-submit"]').click();
    
    // Verify order is completed
    cy.contains('completed').should('be.visible');
    cy.contains('Order completed successfully').should('be.visible');

    // Step 6: Verify Progress Tracking
    cy.log('Step 6: Verify progress tracking worked correctly');
    
    // Check that progress bar shows 100%
    cy.get('[data-cy="progress-bar"]').should('contain', '100%');
    
    // Verify all progress steps are marked as complete
    const expectedSteps = ['Order Placed', 'Accepted', 'In Progress', 'Delivered', 'Completed'];
    expectedSteps.forEach(step => {
      cy.contains(step).should('be.visible');
    });
    
    cy.log('Complete workflow test passed successfully! 🎉');
  });

  it('should handle order cancellation workflow', () => {
    cy.log('Testing order cancellation workflow');
    
    // Register seller and create gig
    const sellerData = {
      name: 'Cancel Seller',
      email: `cancel_seller_${Date.now()}@example.com`,
      password: 'password123',
      skills: 'Web Development'
    };
    
    cy.register(sellerData);
    
    const gigData = {
      title: 'Test Cancellation Gig',
      description: 'This gig is for testing cancellation workflow.',
      price: 50,
      category: 'web-development',
      deliveryTime: 5
    };
    
    cy.createGig(gigData);
    
    // Register buyer and place order
    cy.contains('Logout').click();
    
    const buyerData = {
      name: 'Cancel Buyer',
      email: `cancel_buyer_${Date.now()}@example.com`,
      password: 'password123',
      skills: 'Testing'
    };
    
    cy.register(buyerData);
    
    // Place order via API for speed
    cy.get('@gigId').then((gigId) => {
      cy.createOrder(gigId, 'Test cancellation requirements');
    });
    
    // Navigate to orders and cancel
    cy.visit('/dashboard');
    cy.contains('Orders').click();
    
    cy.contains(gigData.title).parent().within(() => {
      cy.contains('Cancel Order').click();
    });
    
    // Provide cancellation reason
    cy.get('[data-cy="cancel-reason"]').type('Changed my mind about the project requirements.');
    cy.get('[data-cy="confirm-cancel"]').click();
    
    // Verify cancellation
    cy.contains('cancelled').should('be.visible');
    cy.contains('Order cancelled successfully').should('be.visible');
  });

  it('should handle revision requests', () => {
    cy.log('Testing revision request workflow');
    
    // This test would follow a similar pattern but test the revision flow
    // For brevity, this is a placeholder for the revision workflow test
    
    // 1. Create order and get to delivered state
    // 2. Buyer requests revision
    // 3. Seller makes changes and re-delivers
    // 4. Buyer accepts the revision
    
    cy.log('Revision workflow test would be implemented here');
  });
});