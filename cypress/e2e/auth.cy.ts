/// <reference types="cypress" />
/* eslint-disable @typescript-eslint/no-namespace */

// Extend Cypress chainable interface with custom commands

declare global {
  namespace Cypress {
    interface Chainable {
      signup(alias: string, pass: string): Chainable<void>;
      login(alias: string, pass: string): Chainable<void>;
      logout(): Chainable<void>;
    }
  }
}

// Authentication happy path tests

describe('Authentication', () => {
  const alias = `testuser_${Date.now()}`;
  const pass = alias; // simple pass equal to alias for convenience

  it('should sign up, logout, and login successfully', () => {
    // Sign-up flow
    cy.signup(alias, pass);

    // After sign-up we should be on the home page
    cy.contains('button', 'New Document').should('be.visible');

    // Logout flow
    cy.logout();
    cy.location('hash').should('eq', '#/');

    // Login flow
    cy.login(alias, pass);
    cy.contains('button', 'New Document').should('be.visible');

    // Final logout to clean up session
    cy.logout();
  });
});

export {}; // Make this file a module to allow global augmentation
