/// <reference types="cypress" />

// Conflict resolution tests

const LOCAL_EDIT = 'LOCAL_EDIT_123';
const REMOTE_EDIT = 'REMOTE_EDIT_456';

describe('Conflict resolution dialog', () => {
  const alias = `conflict_${Date.now()}`;
  const pass = alias;
  const docTitle = `ConflictDoc_${Date.now()}`;

  it('shows conflict dialog and keeps local edit when chosen', function () {
    // Sign up and create document
    cy.signup(alias, pass);
    cy.get('[data-cy="btn-new-doc"]').click();
    cy.get('[data-cy="input-new-title"]').type(docTitle);
    cy.get('[data-cy="btn-create-doc"]').click();

    // Capture docId from list
    cy.contains('[data-cy="doc-item-title"]', docTitle, { timeout: 15000 })
      .should('be.visible')
      .then(($el) => {
        const docId = ($el[0] as HTMLElement).closest('[data-doc-id]')?.getAttribute('data-doc-id');
        expect(docId, 'docId extracted').to.be.a('string');
        cy.wrap(docId as string).as('docId');
      });

    // Open doc
    cy.contains('[data-cy="doc-item-title"]', docTitle).click();

    // Type local edit while online
    cy.get('[data-cy="editor"]').within(() => {
      cy.get('[contenteditable="true"]').type(`${LOCAL_EDIT}`, { delay: 10 });
    });

    // Simulate going offline
    cy.window().then((win) => {
      // Override navigator.onLine
      Object.defineProperty(win.navigator, 'onLine', {
        configurable: true,
        get: () => false,
      });
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      win.blockGunConnections();
      win.dispatchEvent(new Event('offline'));
    });

    // Type additional local edit while offline (draft)
    cy.get('[data-cy="editor"]').within(() => {
      cy.get('[contenteditable="true"]').type(' OFFLINE', { delay: 10 });
    });
    cy.wait(400); // allow debounce to persist draft

    // Simulate remote edit while offline
    cy.get('@docId').then((docId) => {
      cy.window({ timeout: 20000 }).then(async (win) => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const gun = win.gun;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const SEA: any = (win as any).SEA || (win as any).$sea;
        const user = gun.user();
        const myPair = user._.sea;

        const docIdStr = docId as unknown as string;
        const docRef = gun.get('documents').get(docIdStr);

        const encKey = await new Promise<string>((resolve) => {
          docRef
            .get('keys')
            .get(user.is.pub)
            .once((k: string) => resolve(k));
        });

        const secret = await SEA.secret(myPair.epub, myPair);
        const symKey = await SEA.decrypt(encKey, secret);
        const encryptedRemote = await SEA.encrypt(REMOTE_EDIT, symKey);

        docRef.get('text').put(encryptedRemote);
        return null;
      });
    });

    // Go back online + wait for potential chunk reload
    cy.window().then((win) => {
      Object.defineProperty(win.navigator, 'onLine', {
        configurable: true,
        get: () => true,
      });
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      win.restoreGunConnections();
      win.dispatchEvent(new Event('online'));
      cy.wait(2000); // Wait for CI to stabilize after online event
    });

    // Expect conflict dialog
    cy.get('[data-cy="conflict-dialog"]', { timeout: 15000 }).should('be.visible');
    cy.get('[data-cy="local-content"]').should('contain.text', LOCAL_EDIT);
    cy.get('[data-cy="remote-content"]').should('contain.text', REMOTE_EDIT);

    // Choose Keep Local
    cy.get('[data-cy="btn-keep-local"]').click();

    // Dialog should close
    cy.get('[data-cy="conflict-dialog"]').should('not.exist');

    // Editor should contain local edit but not remote edit
    cy.get('[data-cy="editor"]', { timeout: 10000 }).should('contain.text', LOCAL_EDIT);
    cy.get('[data-cy="editor"]').should('not.contain.text', REMOTE_EDIT);

    // Reload to ensure persisted
    cy.reload();
    cy.contains('[data-cy="doc-item-title"]', docTitle).click();
    cy.get('[data-cy="editor"]', { timeout: 10000 }).should('contain.text', LOCAL_EDIT);
    cy.get('[data-cy="editor"]').should('not.contain.text', REMOTE_EDIT);
  });
});
