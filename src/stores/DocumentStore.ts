/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/require-await */

import { defineStore } from 'pinia';
import { ref } from 'vue';
import { gun, SEA } from 'boot/vueGun';
import { Notify } from 'quasar';

interface DocumentMeta {
  id: string;
  title: string;
  role: 'owner' | 'editor' | 'viewer';
  creator: string;
}

export const useDocumentStore = defineStore('documents', () => {
  // Reactive state
  const docs = ref<DocumentMeta[]>([]);

  const user = gun.user();
  const myPair: any = (user as any)._.sea; // key pair
  const myPub: string | undefined = (user.is as any)?.pub;

  function normalizeRole(val: unknown): 'viewer' | 'editor' | undefined {
    if (!val) return undefined;
    if (typeof val === 'string') {
      const v = val.toLowerCase();
      return v === 'viewer' || v === 'editor' ? v : undefined;
    }
    if (typeof val === 'object') {
      const k = Object.keys(val as Record<string, unknown>)[0];
      if (k === 'viewer' || k === 'editor') return k;
    }
    return undefined;
  }

  // Helper that fetches frequently-needed metadata for a doc
  async function fetchDocMeta(docRef: any): Promise<{
    title: string | undefined;
    isOwner: boolean;
    roleVal: string | undefined;
    creatorAlias: string | undefined;
  }> {
    const [title, isOwner, roleVal, creatorAlias] = await Promise.all([
      new Promise<string | undefined>((res) =>
        docRef.get('title').once((t: any) => res(t as string | undefined)),
      ),
      new Promise<boolean>((res) =>
        docRef
          .get('owners')
          .get(myPub)
          .once((o: any) => res(!!o)),
      ),
      new Promise<string | undefined>((res) =>
        docRef
          .get('roles')
          .get(myPub)
          .once((r: any) => res(r as string | undefined)),
      ),
      new Promise<string | undefined>((res) =>
        docRef.get('creatorAlias').once((a: any) => res(a as string | undefined)),
      ),
    ]);

    return { title, isOwner, roleVal, creatorAlias };
  }

  /**
   * Create a brand-new empty document, generate a symmetric key for it, and
   * register current user as owner.
   */
  async function createDocument(title = 'Untitled') {
    if (!myPub) {
      Notify.create({ type: 'negative', message: 'User not authenticated' });
      return;
    }

    // Generate IDs & keys
    const docId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    const symKey = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);

    // Encrypt symmetric key for self using Diffie-Hellman secret
    const secret = await (SEA as any).secret(myPair.epub, myPair);
    const encKey = await SEA.encrypt(symKey, secret);

    const docRef = gun.get('documents').get(docId);

    // Basic meta information
    docRef.get('title').put(title);
    docRef.get('created').put(Date.now());

    // Store creator alias for UI purposes
    const selfAlias = await new Promise<string | undefined>((res) =>
      user.get('alias').once((a: any) => res(a as string | undefined)),
    );
    docRef.get('creatorAlias').put(selfAlias || 'unknown');

    // Register ownership & encrypted key
    docRef.get('owners').get(myPub).put(true);
    docRef.get('keys').get(myPub).put(encKey);
    // Track which pub encrypted the key for each recipient (self in this case)
    docRef.get('keyEncryptor').get(myPub).put(myPair.epub);

    // Keep reverse reference from user -> document
    user.get('docs').get(docId).put(true);

    Notify.create({ type: 'positive', message: 'Document created' });
  }

  /**
   * Share an existing document with another user by their alias.
   */
  function shareDocument(docId: string, alias: string, role: 'editor' | 'viewer' = 'editor'): void {
    const docRef = gun.get('documents').get(docId);

    // 1. Resolve alias -> pub key
    gun.get('~@' + alias).once((aliasData: any) => {
      (() => {
        if (!aliasData) {
          Notify.create({ type: 'negative', message: 'Alias not found' });
          return;
        }
        const soulKey = Object.keys(aliasData).find((k) => k.slice(0, 1) === '~');
        if (!soulKey) {
          Notify.create({ type: 'negative', message: 'Target pub key not found' });
          return;
        }
        const targetPub = soulKey.replace(/^~/, '');
        // Fetch recipient's encryption public key (epub)
        gun
          .get('~' + targetPub)
          .get('epub')
          .once(async (targetEpub: string) => {
            if (!targetEpub) {
              Notify.create({ type: 'negative', message: 'Recipient epub not found' });
              return;
            }
            // 2. Get our encrypted symmetric key, decrypt it, then re-encrypt for target
            docRef
              .get('keys')
              .get(myPub as string)
              .once(async (ownEncKey: any) => {
                if (!ownEncKey) {
                  Notify.create({ type: 'negative', message: 'Cannot access encryption key' });
                  return;
                }
                const secretSelf = await (SEA as any).secret(myPair.epub, myPair);
                const symKey = (await (SEA as any).decrypt(ownEncKey, secretSelf)) as
                  | string
                  | undefined;
                if (!symKey) {
                  Notify.create({ type: 'negative', message: 'Failed to decrypt key' });
                  return;
                }

                // 3. Encrypt for recipient using their epub
                const secretForRecipient = await (SEA as any).secret(targetEpub as any, myPair);
                const encForRecipient = await (SEA as any).encrypt(symKey, secretForRecipient);

                // 4. Store in document meta and add to recipient index
                docRef.get('keys').get(targetPub).put(encForRecipient);
                // Track encryptor (store our epub)
                docRef.get('keyEncryptor').get(targetPub).put(myPair.epub);
                // Assign role
                docRef.get('roles').get(targetPub).put(role);

                Notify.create({ type: 'positive', message: `Shared with ${alias}` });
              });
          });
      })();
    });
  }

  /**
   * Load list of documents the current user owns or are shared with them.
   */
  function loadDocuments() {
    if (!myPub) return;

    docs.value.length = 0; // reset

    const addDoc = (
      docId: string,
      role: 'owner' | 'editor' | 'viewer',
      title: string | undefined,
      creator: string | undefined,
    ) => {
      if (docs.value.some((d) => d.id === docId)) return; // avoid dupes

      const entry = {
        id: docId,
        title: title || 'Untitled',
        role,
        creator: creator || '',
      } as DocumentMeta;
      docs.value.push(entry);

      // Live role updates
      gun
        .get('documents')
        .get(docId)
        .get('roles')
        .get(myPub)
        .on((r: any) => {
          const norm = normalizeRole(r) || 'viewer';
          if (entry.role !== 'owner' && entry.role !== norm) {
            entry.role = norm;
          }
        });
    };

    // 1. Docs explicitly referenced in the user's list (owner or shared)
    user
      .get('docs')
      .map()
      .once((isTrue: any, docId: string) => {
        if (!isTrue) return;
        const docRef = gun.get('documents').get(docId);
        fetchDocMeta(docRef)
          .then(({ title, isOwner, roleVal, creatorAlias }) => {
            const norm = normalizeRole(roleVal);
            const role: 'owner' | 'editor' | 'viewer' = isOwner ? 'owner' : norm || 'viewer';
            addDoc(docId, role, title, creatorAlias);
          })
          .catch(() => {});
      });

    // 2. Fallback discovery: scan all documents for roles including current user
    gun
      .get('documents')
      .map()
      .on((docMeta: any, docId: string) => {
        if (!docId) return;
        const docRef = gun.get('documents').get(docId);
        fetchDocMeta(docRef)
          .then(({ title, roleVal, creatorAlias }) => {
            if (!roleVal) return; // current user not a participant
            const norm = normalizeRole(roleVal);
            const role: 'editor' | 'viewer' = norm || 'viewer';
            addDoc(docId, role, title, creatorAlias);
          })
          .catch(() => {});
      });
  }

  /**
   * Rename a document title
   */
  function renameDocument(docId: string, newTitle: string) {
    const docRef = gun.get('documents').get(docId);
    docRef.get('title').put(newTitle);
    // Update local cached list
    const item = docs.value.find((d) => d.id === docId);
    if (item) item.title = newTitle;
  }

  /**
   * Delete a document and remove all references for the current user.
   * Note: In GUN, setting a node to `null` breaks references but data may still exist on
   * other peers until garbage-collected. This implementation focuses on making the
   * document disappear for the current user and anyone that receives this `null` update.
   */
  function deleteDocument(docId: string) {
    if (!myPub) {
      Notify.create({ type: 'negative', message: 'User not authenticated' });
      return;
    }

    const docRef = gun.get('documents').get(docId);

    // Break references from our user profile to this doc
    user.get('docs').get(docId).put(null);

    // Remove our ownership/role/key entries so we no longer have access
    docRef.get('owners').get(myPub).put(null);
    docRef.get('roles').get(myPub).put(null);
    docRef.get('keys').get(myPub).put(null);

    // Optionally mark the root doc node as deleted – this removes the data for peers
    docRef.put(null);

    // Remove from local list
    docs.value = docs.value.filter((d) => d.id !== docId);

    Notify.create({ type: 'positive', message: 'Document deleted' });
  }

  return { docs, createDocument, shareDocument, loadDocuments, renameDocument, deleteDocument };
});
