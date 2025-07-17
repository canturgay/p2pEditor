/// <reference types="cypress" />

// Shared document real-time sync tests

describe('Shared document sync', () => {
  const owner = {
    alias: `sync_owner_${Date.now()}`,
  } as const;
  const other = {
    alias: `sync_other_${Date.now()}`,
  } as const;
  const passOwner = owner.alias;
  const passOther = other.alias;
  const docTitle = `SyncDoc_${Date.now()}`;
  const firstText = 'Hello from owner';
  const secondText = 'Update from collaborator';

  it('propagates content between shared users', () => {
    // Owner signup and create + edit doc
    cy.signup(owner.alias, passOwner);

    cy.get('[data-cy="btn-new-doc"]').click();
    cy.get('[data-cy="input-new-title"]').type(docTitle);
    cy.get('[data-cy="btn-create-doc"]').click();

    // Open document
    cy.contains('[data-cy="doc-item-title"]', docTitle).click();

    // Type firstText into editor
    cy.get('[data-cy="editor"]').within(() => {
      cy.get('[contenteditable="true"]').type(`${firstText}{enter}`, { delay: 10 });
    });

    // Back to list
    cy.get('[data-cy="btn-back"]').click();

    // After firstText typed and back button clicked
    cy.logout();

    // Collaborator pre-creates account (will not see doc yet)
    cy.signup(other.alias, passOther);
    cy.contains('[data-cy="doc-item-title"]', docTitle).should('not.exist');
    cy.logout();

    // Owner logs back in and shares document
    cy.login(owner.alias, passOwner);
    cy.contains('[data-cy="doc-item-title"]', docTitle)
      .parents('.q-item')
      .within(() => {
        cy.get('[data-cy="icon-share-doc"]').click({ force: true });
      });
    cy.get('[data-cy="input-share-alias"]').type(other.alias);
    cy.get('[data-cy="btn-share-doc"]').click();

    cy.logout();

    // Collaborator logs in to access shared doc
    cy.login(other.alias, passOther);
    cy.get('[data-cy="btn-refresh"]').click();
    cy.contains('[data-cy="doc-item-title"]', docTitle, { timeout: 15000 }).should('be.visible');
    cy.contains('[data-cy="doc-item-title"]', docTitle).click();

    // Should see firstText
    cy.get('[data-cy="editor"]').should('contain.text', firstText);

    // Add collaborator update
    cy.get('[data-cy="editor"]').within(() => {
      cy.get('[contenteditable="true"]').type(`\n${secondText}`, { delay: 10 });
    });
    cy.get('[data-cy="btn-back"]').click();
    cy.logout();

    // Owner logs in again – should see both texts
    cy.login(owner.alias, passOwner);
    cy.contains('[data-cy="doc-item-title"]', docTitle).click();
    cy.get('[data-cy="editor"]', { timeout: 15000 }).should('contain.text', firstText);
    cy.get('[data-cy="editor"]').should('contain.text', secondText);
  });
});
