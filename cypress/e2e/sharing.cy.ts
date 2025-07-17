/// <reference types="cypress" />

// Document sharing tests

describe('Document sharing', () => {
  const ownerAlias = `owner_${Date.now()}`;
  const pass = ownerAlias;
  const otherAlias = `other_${Date.now()}`;
  const otherPass = otherAlias;
  const docTitle = `SecretDoc_${Date.now()}`;

  it('doc not visible to another user until shared, then visible after share', () => {
    // Owner signup and create a document
    cy.signup(ownerAlias, pass);
    cy.get('[data-cy="btn-new-doc"]').click();
    cy.get('[data-cy="input-new-title"]').type(docTitle);
    cy.get('[data-cy="btn-create-doc"]').click();
    cy.contains('[data-cy="doc-item-title"]', docTitle, { timeout: 10000 }).should('be.visible');
    cy.logout();

    // Other user signup – should NOT see the document
    cy.signup(otherAlias, otherPass);
    cy.contains('[data-cy="doc-item-title"]', docTitle).should('not.exist');
    cy.logout();

    // Owner logs in and shares the doc with other user
    cy.login(ownerAlias, pass);
    cy.contains('[data-cy="doc-item-title"]', docTitle)
      .parents('.q-item')
      .within(() => {
        cy.get('[data-cy="icon-share-doc"]').click({ force: true });
      });
    cy.get('[data-cy="input-share-alias"]').type(otherAlias);
    // Leave default permission (editor)
    cy.get('[data-cy="btn-share-doc"]').click();
    // Wait for notification and close dialog automatically then logout
    cy.logout();

    // Other user logs in again and should now see the doc
    cy.login(otherAlias, otherPass);
    // Ensure list loaded
    cy.get('[data-cy="btn-refresh"]').click();
    cy.contains('[data-cy="doc-item-title"]', docTitle, { timeout: 10000 }).should('be.visible');
  });
});
