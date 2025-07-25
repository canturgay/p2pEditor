/* eslint-disable @typescript-eslint/no-explicit-any */
import { defineStore } from 'pinia';
import { watch, ref } from 'vue';
import { gun, SEA } from 'boot/vueGun';
import { useNetworkStore } from './NetworkStore';

export const useEditorStore = defineStore('editor', () => {
  const content = ref('');
  const activeDocId = ref<string | null>(null);
  let textNode: any = null;
  let symKey: string | null = null;
  let lastSent = '';
  let offHandler: any = null;
  let draftNode: any = null;
  let baselineRemote: string | null = null;
  const networkStore = useNetworkStore();
  const conflict = ref<{ local: string; remote: string } | null>(null);
  const latestRemote = ref('');
  const canEdit = ref(true);

  const user = gun.user();
  const myPair: any = (user as any)._.sea;
  const myPub: string | undefined = (user.is as any)?.pub;

  async function reconcileDraft() {
    if (!symKey || !textNode || !draftNode) return;
    const encDraft = await new Promise<any>((res) => draftNode.once((v: any) => res(v)));

    let localText = '';
    if (typeof encDraft === 'string') {
      const dec = await (SEA as any).decrypt(encDraft, symKey);
      if (typeof dec === 'string') localText = dec;
    }

    const remoteText = latestRemote.value;

    if (!localText) return; // nothing to sync

    // If remote hasn't changed since we went offline, auto-apply local
    if (baselineRemote !== null && baselineRemote === remoteText) {
      const newEnc =
        typeof encDraft === 'string' ? encDraft : await (SEA as any).encrypt(localText, symKey);
      lastSent = newEnc;
      textNode.put(newEnc);
      draftNode.put(null);
      baselineRemote = null;
      return;
    }

    if (localText === remoteText) {
      draftNode.put(null);
      baselineRemote = null;
      return;
    }

    conflict.value = { local: localText, remote: remoteText };
  }

  async function keepLocal() {
    if (!conflict.value || !symKey) return;
    const encrypted = await (SEA as any).encrypt(conflict.value.local, symKey);
    lastSent = encrypted;
    textNode.put(encrypted);
    draftNode.put(null);
    content.value = conflict.value.local;
    conflict.value = null;
  }

  function acceptRemote() {
    if (!conflict.value) return;
    draftNode.put(null);
    content.value = conflict.value.remote;
    conflict.value = null;
    baselineRemote = null;
  }

  async function applyMerge(mergedText: string) {
    if (!symKey) return;
    const encrypted = await (SEA as any).encrypt(mergedText, symKey);
    lastSent = encrypted;
    if (textNode) textNode.put(encrypted);
    if (draftNode) draftNode.put(null);
    content.value = mergedText;
    conflict.value = null;
    baselineRemote = null;
  }

  // Watch online/offline transitions
  watch(
    () => networkStore.isOnline,
    async (online, prev) => {
      if (!online && prev) {
        // Just went offline: capture baseline remote content
        baselineRemote = content.value;
      }
      if (online && !prev) {
        // await to get up to date remote content
        await new Promise((resolve) => setTimeout(resolve, 10000));
        // Reconnected – attempt sync
        reconcileDraft().catch((e) => {
          console.error(e);
        });
      }
    },
  );

  // Watch remote updates when we have pending baselineRemote (i.e., after reconnect)
  watch(latestRemote, async () => {
    if (networkStore.isOnline && baselineRemote !== null) {
      await reconcileDraft();
    }
  });

  async function openDocument(docId: string) {
    if (!myPub) return;

    // cleanup previous listener
    if (offHandler && textNode) {
      textNode.off();
      offHandler = null;
    }

    activeDocId.value = docId;
    canEdit.value = false;
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

    // Determine role
    const [roleVal, ownerFlag] = await Promise.all([
      new Promise<string | undefined>((resolve) => {
        docRef
          .get('roles')
          .get(myPub)
          .once((r: any) => resolve(r as string | undefined), { wait: 1500 });
      }),
      new Promise<boolean>((resolve) => {
        docRef
          .get('owners')
          .get(myPub)
          .once((v: any) => resolve(!!v));
      }),
    ]);

    if (roleVal === 'viewer') {
      canEdit.value = false;
    } else if (roleVal === 'editor') {
      canEdit.value = true;
    } else {
      // If no explicit role, fall back to ownership flag
      canEdit.value = ownerFlag;
    }

    textNode = docRef.get('text');
    draftNode = docRef.get('drafts').get(myPub);

    // Load existing draft first (offline edits)
    draftNode.once(async (encDraft: any) => {
      if (!encDraft) return;
      if (!symKey) return;
      try {
        const dec = await (SEA as any).decrypt(encDraft, symKey);
        if (typeof dec === 'string') {
          content.value = dec;
        }
      } catch {
        /* ignore */
      }
    });

    // Listen for remote updates
    offHandler = textNode.on(async (data: any) => {
      if (typeof data !== 'string') return;
      if (!symKey) return;
      const decrypted = await (SEA as any).decrypt(data, symKey);
      if (typeof decrypted !== 'string') return;
      latestRemote.value = decrypted;
      if (decrypted !== content.value && data !== lastSent) {
        content.value = decrypted;
      }
    });

    // Keep listening for role changes to adjust canEdit dynamically
    docRef
      .get('roles')
      .get(myPub)
      .on((role: any) => {
        if (role === 'viewer') canEdit.value = false;
        else if (role === 'editor') canEdit.value = true;
      });
  }

  let saveTimer: ReturnType<typeof setTimeout> | null = null;

  async function persistNow(text: string) {
    if (!symKey) return;
    if (text === '') return;

    const encrypted = await (SEA as any).encrypt(text, symKey);

    if (networkStore.isOnline && textNode) {
      if (encrypted === lastSent) return;
      textNode.put(encrypted);
    } else if (draftNode) {
      draftNode.put(encrypted);
    }
    lastSent = encrypted;
  }

  watch(content, (newVal) => {
    if (!symKey) return;
    if (newVal === '') return;
    if (!canEdit.value) return; // viewers cannot persist

    // Clear previous pending save
    if (saveTimer) clearTimeout(saveTimer);

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    saveTimer = setTimeout(async () => {
      await persistNow(newVal);
    }, 300); // 300 ms idle debounce
  });

  function close() {
    // flush pending save immediately
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
      void persistNow(content.value);
    }

    if (offHandler && textNode) {
      textNode.off();
    }
    activeDocId.value = null;
    content.value = '';
    symKey = null;
  }

  return {
    content,
    active: activeDocId,
    conflict,
    canEdit,
    openDocument,
    close,
    keepLocal,
    acceptRemote,
    applyMerge,
  };
});
