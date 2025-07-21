/// <reference types="cypress" />
/* eslint-env cypress */
/* eslint-disable @typescript-eslint/no-namespace */
/* global cy, Cypress */

// Custom Cypress commands for authentication flows

Cypress.Commands.add('signup', (alias: string, pass: string) => {
  cy.visit('/');

  // Ensure no prior auth session persists
  cy.window().then((win) => {
    win.sessionStorage.clear();
  });

  // If already authenticated, logout first
  cy.get('body').then(($body) => {
    if ($body.find('button').filter((_, el) => el.textContent?.trim() === 'Logout').length) {
      cy.logout();
      cy.visit('/');
    }
  });

  cy.get('[data-cy="input-username"]').clear({ force: true });
  cy.get('[data-cy="input-username"]').type(alias, { force: true });
  cy.get('[data-cy="input-pass"]').clear({ force: true });
  cy.get('[data-cy="input-pass"]').type(pass, { force: true });
  cy.get('[data-cy="btn-signup"]').click();
  cy.location('hash', { timeout: 10000 }).should('eq', '#/home');
});

Cypress.Commands.add('login', (alias: string, pass: string) => {
  cy.visit('/');
  cy.get('[data-cy="input-username"]').clear({ force: true });
  cy.get('[data-cy="input-username"]').type(alias, { force: true });
  cy.get('[data-cy="input-pass"]').clear({ force: true });
  cy.get('[data-cy="input-pass"]').type(pass, { force: true });
  cy.get('[data-cy="btn-signin"]').click();
  cy.location('hash', { timeout: 10000 }).should('eq', '#/home');
});

Cypress.Commands.add('logout', () => {
  cy.get('body').then(($body) => {
    const btn = $body.find('button').filter((_, el) => el.textContent?.trim() === 'Logout');
    if (btn.length) {
      cy.wrap(btn).click();
      cy.location('hash', { timeout: 10000 }).should(($h) => {
        expect(['', '#/']).to.include($h);
      });
    } else {
      // Already logged out; ensure we are on auth page
      cy.location('hash', { timeout: 10000 }).should(($h) => {
        expect(['', '#/']).to.include($h);
      });
    }
  });
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
