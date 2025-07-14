import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { gun } from 'boot/vueGun';
import diff_match_patch from 'diff-match-patch';

export const useEditorStore = defineStore('editor', () => {
  const content = ref('');

  // diff-match-patch instance
  const dmp = new diff_match_patch();

  // Gun nodes: authenticated user's document text and patches
  const docNode = gun.user().get('document');
  const patchesNode = docNode.get('patches');

  // Track last known synced content and last patch we sent (to ignore echoes)
  let lastKnownContent = '';
  let lastSentPatch = '';

  // Apply incoming patches (existing & future)
  patchesNode.map().on((patchText) => {
    if (typeof patchText !== 'string') return;
    if (patchText === lastSentPatch) return; // Ignore our own patch echoes

    const incomingPatches = dmp.patch_fromText(patchText);
    const [updatedText] = dmp.patch_apply(incomingPatches, content.value);

    if (updatedText === content.value) return; // No change

    content.value = updatedText;
    lastKnownContent = updatedText;
  });

  // Persist local edits as patches
  watch(content, (newVal) => {
    if (newVal === lastKnownContent) return; // Already in sync

    const patches = dmp.patch_make(lastKnownContent, newVal);
    const patchText = dmp.patch_toText(patches);

    // Update trackers before network send to avoid echo
    lastKnownContent = newVal;
    lastSentPatch = patchText;

    // Broadcast patch to peers
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    patchesNode.set(patchText as any);
  });

  return { content };
});
