/* eslint-disable @typescript-eslint/no-explicit-any */
import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { gun, SEA } from 'boot/vueGun';

export const useEditorStore = defineStore('editor', () => {
  const content = ref('');
  const activeDocId = ref<string | null>(null);
  let textNode: any = null;
  let symKey: string | null = null;
  let lastSent = '';
  let offHandler: any = null;

  const user = gun.user();
  const myPair: any = (user as any)._.sea;
  const myPub: string | undefined = (user.is as any)?.pub;

  async function openDocument(docId: string) {
    if (!myPub) return;

    // cleanup previous listener
    if (offHandler && textNode) {
      textNode.off();
      offHandler = null;
    }

    activeDocId.value = docId;
    content.value = '';
    lastSent = '';
    symKey = null;

    const docRef = gun.get('documents').get(docId);
    const encKey = await new Promise<string | undefined>((resolve) => {
      docRef
        .get('keys')
        .get(myPub)
        .once((k: any) => resolve(k as string | undefined));
    });
    if (!encKey) {
      console.error('Encrypted key not found');
      return;
    }

    const encryptorEpub = await new Promise<string | undefined>((resolve) => {
      docRef
        .get('keyEncryptor')
        .get(myPub)
        .once((v: any) => resolve(v as string | undefined));
    });

    // Prefer the recorded encryptor epub, otherwise use our own epub (older docs)
    const tryKeys = [encryptorEpub, myPair.epub].filter(Boolean) as string[];

    let decryptedSym: string | undefined;
    for (const k of tryKeys) {
      try {
        const secret = await (SEA as any).secret(k as any, myPair);
        const res = await (SEA as any).decrypt(encKey, secret);
        if (typeof res === 'string') {
          decryptedSym = res;
          break;
        }
      } catch {
        /* continue trying next key */
      }
    }

    if (!decryptedSym) {
      console.error('Failed to decrypt symmetric key for document');
      return;
    }

    symKey = decryptedSym;

    textNode = docRef.get('text');

    // Listen for remote updates
    offHandler = textNode.on(async (data: any) => {
      if (typeof data !== 'string') return;
      if (data === lastSent) return;
      if (!symKey) return;
      const decrypted = await (SEA as any).decrypt(data, symKey);
      if (typeof decrypted === 'string' && decrypted !== content.value) {
        content.value = decrypted;
      }
    });
  }

  function close() {
    if (offHandler && textNode) {
      textNode.off();
    }
    activeDocId.value = null;
    content.value = '';
    symKey = null;
  }

  // Persist local edits
  watch(content, async (newVal) => {
    if (!symKey || !textNode) return;
    if (newVal === lastSent) return;
    const encrypted = await (SEA as any).encrypt(newVal, symKey);
    lastSent = encrypted;
    textNode.put(encrypted);
  });

  return { content, active: activeDocId, openDocument, close };
});
