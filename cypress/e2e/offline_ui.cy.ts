/// <reference types="cypress" />

describe('Offline UI indicator', () => {
  it('shows correct banner messages on auth and home pages', () => {
    cy.visit('/');
    // Simulate offline on auth page
    cy.window().then((win) => {
      Object.defineProperty(win.navigator, 'onLine', { configurable: true, get: () => false });
      win.dispatchEvent(new Event('offline'));
    });

    // Banner should appear with auth message
    cy.get('[data-cy="offline-banner"]', { timeout: 5000 })
      .should('be.visible')
      .and('contain.text', 'Sign in may be unavailable');

    // Go online again
    cy.window().then((win) => {
      Object.defineProperty(win.navigator, 'onLine', { configurable: true, get: () => true });
      win.dispatchEvent(new Event('online'));
    });

    cy.get('[data-cy="offline-banner"]').should('not.exist');

    // Sign up to reach home page
    const alias = `offline_${Date.now()}`;
    cy.signup(alias, alias);

    // Simulate offline on home page
    cy.window().then((win) => {
      Object.defineProperty(win.navigator, 'onLine', { configurable: true, get: () => false });
      win.dispatchEvent(new Event('offline'));
    });

    cy.get('[data-cy="offline-banner"]', { timeout: 5000 })
      .should('be.visible')
      .and('contain.text', 'Changes will be saved locally');

    // Restore online to not affect subsequent specs
    cy.window().then((win) => {
      Object.defineProperty(win.navigator, 'onLine', { configurable: true, get: () => true });
      win.dispatchEvent(new Event('online'));
    });
  });
});
