/// <reference types="cypress" />

// Authentication edge case tests

describe('Authentication edge cases', () => {
  const alias = `edgeuser_${Date.now()}`;
  const pass = alias;
  const wrongPass = `${pass}_wrong`;

  before(() => {
    // Create user first
    cy.signup(alias, pass);
    cy.logout();
  });

  it('should not allow signing up with an existing alias', () => {
    cy.visit('/');
    cy.get('[data-cy="input-username"]').clear().type(alias);
    cy.get('[data-cy="input-pass"]').clear().type(pass);
    cy.get('[data-cy="btn-signup"]').click();

    // User should stay on auth page
    cy.location('hash').should('eq', '#/');

    // A negative notification should appear
    cy.contains('.q-notification__message', 'Alias already exists', { timeout: 5000 }).should(
      'be.visible',
    );
  });

  it('should show error when password is incorrect on login', () => {
    cy.visit('/');
    cy.get('[data-cy="input-username"]').clear().type(alias);
    cy.get('[data-cy="input-pass"]').clear().type(wrongPass);
    cy.get('[data-cy="btn-signin"]').click();

    // User should stay on auth page
    cy.location('hash').should('eq', '#/');

    // A negative notification should appear
    cy.contains('.q-notification__message', 'Sign in error', { timeout: 5000 }).should(
      'be.visible',
    );
  });
});
