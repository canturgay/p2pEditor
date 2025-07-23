/// <reference types="cypress" />

/**
 * Scalability & Stress Tests
 *
 * 1. Large document size (50 000 characters)
 * 2. Sharing with many collaborators (default 5 – adjustable via COLLAB_COUNT)
 */

const LARGE_TEXT_LENGTH = 50000;
const MANUAL_TYPE_LEN = 2000;
const COLLAB_COUNT = 5;

describe('Scalability edge cases', () => {
  const owner = {
    alias: `scale_owner_${Date.now()}`,
  } as const;
  const passOwner = owner.alias;
  const docTitle = `HugeDoc_${Date.now()}`;

  /**
   * Generates a pseudo-random string of requested length.
   */
  function bigString(len: number) {
    const seed = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. ';
    return seed.repeat(Math.ceil(len / seed.length)).slice(0, len);
  }

  it('handles very large document content', () => {
    const longText = bigString(LARGE_TEXT_LENGTH);

    // Owner signup and create doc
    cy.signup(owner.alias, passOwner);

    cy.get('[data-cy="btn-new-doc"]').click();
    cy.get('[data-cy="input-new-title"]').type(docTitle);
    cy.get('[data-cy="btn-create-doc"]').click();

    cy.contains('[data-cy="doc-item-title"]', docTitle).click();

    // Simulate human typing first portion slowly then paste the rest
    cy.get('[data-cy="editor"]').within(() => {
      cy.get('[contenteditable="true"]').as('input');
    });

    const manualPart = longText.slice(0, MANUAL_TYPE_LEN);
    const pastePart = longText.slice(MANUAL_TYPE_LEN);

    // Manual typing (10ms per char)
    cy.get('@input').type(manualPart, {
      delay: 10,
      parseSpecialCharSequences: false,
    });

    // Simulate paste (no delay)
    cy.get('@input').then(($el) => {
      const el = $el.get(0);
      if (!el) return;

      const clipboard = new DataTransfer();
      clipboard.setData('text/plain', pastePart);

      const pasteEvent = new ClipboardEvent('paste', { clipboardData: clipboard });
      el.dispatchEvent(pasteEvent); // fires `paste`

      // manually insert text then trigger `input`
      el.innerText += pastePart;
      el.dispatchEvent(new InputEvent('input'));
    });

    // Wait for store debounce and persistence
    cy.wait(5000);

    // Navigate back, reload, and ensure the content persisted
    cy.get('[data-cy="btn-back"]').click();
    cy.reload();
    cy.contains('[data-cy="doc-item-title"]', docTitle).click();
    cy.get('[data-cy="editor"]', { timeout: 20000 }).should(($el) => {
      expect($el.text().length).to.be.at.least(LARGE_TEXT_LENGTH);
    });
  });

  it(`supports sharing with ${COLLAB_COUNT} collaborators`, () => {
    // Ensure owner is logged in after previous test (or log in again)
    cy.visit('/');
    cy.logout();
    cy.login(owner.alias, passOwner);

    // Build collaborator accounts
    const collaborators: Array<{ alias: string; pass: string; role: 'editor' | 'viewer' }> = [];
    for (let i = 0; i < COLLAB_COUNT; i++) {
      const alias = `collab_${i}_${Date.now()}`;
      const role = i < COLLAB_COUNT - 2 ? 'editor' : 'viewer'; // last 2 viewers
      collaborators.push({ alias, pass: alias, role });

      // Pre-create account so alias exists
      cy.signup(alias, alias);
      cy.logout();
    }

    // Owner shares document with each collaborator
    cy.login(owner.alias, passOwner);
    cy.contains('[data-cy="doc-item-title"]', docTitle).parents('.q-item').as('docRow');

    cy.wrap(collaborators).each((collab) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { alias, role } = collab as any;
      cy.get('@docRow').within(() => {
        cy.get('[data-cy="icon-share-doc"]').click({ force: true });
      });
      cy.get('[data-cy="input-share-alias"]').clear().type(alias, { force: true });
      // Set role in select if viewer
      if (role === 'viewer') {
        cy.get('[data-cy="select-share-role"]').click();
        cy.contains('div.q-item', 'View Only').click();
      }
      cy.get('[data-cy="btn-share-doc"]').click();
    });
    cy.logout();

    // Each collaborator logs in and verifies doc visibility
    collaborators.forEach(({ alias, pass, role }) => {
      cy.login(alias, pass);
      cy.get('[data-cy="btn-refresh"]').click();
      cy.contains('[data-cy="doc-item-title"]', docTitle, { timeout: 15000 }).should('be.visible');
      cy.contains('[data-cy="doc-item-title"]', docTitle).click();

      if (role === 'editor') {
        const text = `update_by_${alias}`;
        cy.get('[data-cy="editor"]').within(() => {
          cy.get('[contenteditable="true"]')
            .scrollIntoView()
            .type(`\n${text}`, { delay: 5, force: true });
        });
        cy.wait(1500); // allow debounce and gun sync
      } else {
        // viewer should not allow typing – editor should be disabled
        cy.get('[data-cy="view-only-badge"]').should('be.visible');
      }

      cy.get('[data-cy="btn-back"]').click();
      cy.logout();
    });

    // Owner should see updates from editors
    cy.login(owner.alias, passOwner);
    cy.get('[data-cy="btn-refresh"]').click();
    cy.contains('[data-cy="doc-item-title"]', docTitle, { timeout: 15000 }).click();

    collaborators
      .filter((c) => c.role === 'editor')
      .forEach((collab) => {
        const text = `update_by_${collab.alias}`;
        // CI can be slow; wait up to 40s and target only the content area (contenteditable)
        cy.get('[data-cy="editor"]').within(() => {
          cy.contains('[contenteditable="true"]', text, { timeout: 40000 }).should('exist');
        });
      });
  });
});
