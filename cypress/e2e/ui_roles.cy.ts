/// <reference types="cypress" />

/*
 * UI role rendering tests
 */

describe('Role-based UI cues', () => {
  const owner = { alias: `role_owner_${Date.now()}`, pass: `pass${Date.now()}` } as const;
  const editor = { alias: `role_editor_${Date.now()}`, pass: `pass${Date.now()}` } as const;
  const viewer = { alias: `role_viewer_${Date.now()}`, pass: `pass${Date.now()}` } as const;
  const docTitle = `RoleDoc_${Date.now()}`;

  it('displays correct creator, role tags and icon visibility', () => {
    // Owner signup & create doc
    cy.signup(owner.alias, owner.pass);
    cy.get('[data-cy="btn-new-doc"]').click();
    cy.get('[data-cy="input-new-title"]').type(docTitle);
    cy.get('[data-cy="btn-create-doc"]').click();

    // Pre-create collaborator accounts
    cy.signup(editor.alias, editor.pass);
    cy.logout();
    cy.signup(viewer.alias, viewer.pass);
    cy.logout();

    // Owner share roles
    cy.login(owner.alias, owner.pass);
    cy.contains('[data-cy="doc-item-title"]', docTitle).parents('.q-item').as('row');
    const shareWith = (alias: string, role: 'editor' | 'viewer') => {
      cy.get('@row').within(() => {
        cy.get('[data-cy="icon-share-doc"]').click({ force: true });
      });
      cy.get('[data-cy="input-share-alias"]').clear().type(alias);
      if (role === 'viewer') {
        cy.get('[data-cy="select-share-role"]').click();
        cy.contains('div.q-item', 'View Only').click();
      }
      cy.get('[data-cy="btn-share-doc"]').click();
    };

    shareWith(editor.alias, 'editor');
    shareWith(viewer.alias, 'viewer');
    cy.logout();

    // Viewer assertions
    cy.login(viewer.alias, viewer.pass);
    cy.get('[data-cy="doc-role"]').contains('viewer');
    cy.contains('[data-cy="doc-item-title"]', docTitle)
      .parents('.q-item')
      .within(() => {
        cy.get('[data-cy="icon-share-doc"]').should('not.exist');
        cy.get('[data-cy="icon-rename-doc"]').should('not.exist');
      });
    cy.contains('[data-cy="doc-item-title"]', docTitle).click();
    cy.get('[data-cy="view-only-badge"]').should('be.visible');
    cy.go('back');
    cy.logout();

    // Editor assertions
    cy.login(editor.alias, editor.pass);
    cy.get('[data-cy="doc-role"]').contains('editor');
    cy.contains('[data-cy="doc-item-title"]', docTitle)
      .parents('.q-item')
      .within(() => {
        cy.get('[data-cy="icon-share-doc"]').should('exist');
        cy.get('[data-cy="icon-rename-doc"]').should('exist');
        cy.get('[data-cy="icon-delete-doc"]').should('not.exist');
      });
    cy.contains('[data-cy="doc-item-title"]', docTitle).click();
    cy.get('[data-cy="view-only-badge"]').should('not.exist');
    cy.logout();

    // Owner row check – role tag hidden
    cy.login(owner.alias, owner.pass);
    cy.contains('[data-cy="doc-item-title"]', docTitle)
      .parents('.q-item')
      .within(() => {
        cy.get('[data-cy="doc-role"]').should('not.exist');
        cy.get('[data-cy="icon-delete-doc"]').should('exist');
      });
  });
});
