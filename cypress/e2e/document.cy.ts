/// <reference types="cypress" />

// Document creation & deletion happy-path tests

describe('Document management', () => {
  const alias = `docuser_${Date.now()}`;
  const pass = alias;
  const title = `Doc_${Date.now()}`;

  it('creates and deletes a document successfully', () => {
    // Sign up and land on Home
    cy.signup(alias, pass);

    // Create a new document via the UI
    cy.get('[data-cy="btn-new-doc"]').click();

    cy.get('.q-dialog:visible').within(() => {
      cy.get('[data-cy="input-new-title"]').type(title);
      cy.get('[data-cy="btn-create-doc"]').click();
    });

    // Newly created document should appear in the list
    cy.contains('[data-cy="doc-item-title"]', title, { timeout: 10000 }).should('be.visible');

    // Delete the document – open delete dialog
    cy.contains('[data-cy="doc-item-title"]', title)
      .parents('.q-item')
      .within(() => {
        cy.get('[data-cy="icon-delete-doc"]').click({ force: true });
      });

    // Confirm delete
    cy.get('.q-dialog:visible').within(() => {
      cy.get('[data-cy="btn-delete-doc"]').click();
    });

    // Verify it no longer exists in the list
    cy.contains('[data-cy="doc-item-title"]', title).should('not.exist');
  });
});
