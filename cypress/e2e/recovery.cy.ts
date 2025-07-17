/// <reference types="cypress" />

// Account recovery tests

const downloadsFolder = Cypress.config('downloadsFolder');

function generateUser(prefix: string) {
  const alias = `${prefix}_${Date.now()}`;
  return {
    alias,
    pass: alias,
  } as const;
}

describe('Account recovery – happy path', () => {
  it('allows user to download recovery file and login back using file + alias', () => {
    const user = generateUser('recovery');
    const recoveryFileName = `${user.alias}_recovery.json`;

    // Sign-up and download recovery file
    cy.signup(user.alias, user.pass);
    cy.get('[data-cy="btn-download-recovery"]').click();

    // Ensure file was downloaded
    cy.readFile(`${downloadsFolder}/${recoveryFileName}`, { timeout: 15000 }).should('exist');

    // Logout
    cy.logout();

    // Attach recovery file and perform recovery with alias
    cy.get('[data-cy="input-recovery-file"]').selectFile(`${downloadsFolder}/${recoveryFileName}`, {
      force: true,
    });
    cy.get('[data-cy="input-username"]').clear().type(user.alias);
    cy.get('[data-cy="btn-recover"]').click();

    // Should land on home page
    cy.location('hash', { timeout: 10000 }).should('eq', '#/home');
  });

  it('allows recovery using file + passphrase (username left blank)', () => {
    const user = generateUser('recovery_pass');
    const recoveryFileName = `${user.alias}_recovery.json`;

    cy.signup(user.alias, user.pass);
    cy.get('[data-cy="btn-download-recovery"]').click();
    cy.readFile(`${downloadsFolder}/${recoveryFileName}`, { timeout: 15000 }).should('exist');
    cy.logout();

    // Attach file, provide pass only
    cy.get('[data-cy="input-recovery-file"]').selectFile(`${downloadsFolder}/${recoveryFileName}`, {
      force: true,
    });
    cy.get('[data-cy="input-pass"]').clear().type(user.pass);
    cy.get('[data-cy="btn-recover"]').click();
    cy.location('hash', { timeout: 10000 }).should('eq', '#/home');
  });
});

describe('Account recovery – edge cases', () => {
  it('shows error if neither username nor passphrase provided', () => {
    const user = generateUser('recovery_edge1');
    const recoveryFileName = `${user.alias}_recovery.json`;

    cy.signup(user.alias, user.pass);
    cy.get('[data-cy="btn-download-recovery"]').click();
    cy.readFile(`${downloadsFolder}/${recoveryFileName}`, { timeout: 15000 }).should('exist');
    cy.logout();

    // Attach file only – leave inputs blank
    cy.get('[data-cy="input-recovery-file"]').selectFile(`${downloadsFolder}/${recoveryFileName}`, {
      force: true,
    });
    cy.get('[data-cy="btn-recover"]').click();

    // Should stay on auth page and show notification
    cy.location('hash').should('eq', '#/');
    cy.contains('.q-notification__message', 'Please provide either your username', {
      timeout: 5000,
    }).should('be.visible');
  });

  it('shows error on invalid recovery file', () => {
    // Prepare invalid file in downloads folder
    const invalidPath = `${downloadsFolder}/invalid_recovery.json`;
    cy.writeFile(invalidPath, 'not a valid json');

    cy.visit('/');
    cy.get('[data-cy="input-recovery-file"]').selectFile(invalidPath, { force: true });
    cy.get('[data-cy="input-username"]').type('someuser');
    cy.get('[data-cy="btn-recover"]').click();

    cy.location('hash').should('eq', '#/');
    cy.contains('.q-notification__message', 'Invalid recovery file', { timeout: 5000 }).should(
      'be.visible',
    );
  });
});
