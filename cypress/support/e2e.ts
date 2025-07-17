/// <reference types="cypress" />
/* eslint-env cypress */
/* eslint-disable @typescript-eslint/no-namespace */
/* global cy, Cypress */

// Custom Cypress commands for authentication flows

Cypress.Commands.add('signup', (alias: string, pass: string) => {
  cy.visit('/');
  cy.get('[data-cy="input-username"]').clear().type(alias);
  cy.get('[data-cy="input-pass"]').clear().type(pass);
  cy.get('[data-cy="btn-signup"]').click();
  cy.location('hash', { timeout: 10000 }).should('eq', '#/home');
});

Cypress.Commands.add('login', (alias: string, pass: string) => {
  cy.visit('/');
  cy.get('[data-cy="input-username"]').clear().type(alias);
  cy.get('[data-cy="input-pass"]').clear().type(pass);
  cy.get('[data-cy="btn-signin"]').click();
  cy.location('hash', { timeout: 10000 }).should('eq', '#/home');
});

Cypress.Commands.add('logout', () => {
  cy.contains('button', 'Logout').click();
  cy.location('hash', { timeout: 10000 }).should('eq', '#/');
});

// Augment Cypress types so the new commands are recognized in TypeScript

declare global {
  namespace Cypress {
    interface Chainable {
      signup(alias: string, pass: string): Chainable<void>;
      login(alias: string, pass: string): Chainable<void>;
      logout(): Chainable<void>;
    }
  }
}

export {};
