import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { gun } from 'boot/vueGun';

export const useEditorStore = defineStore('editor', () => {
  const content = ref('');

  // Reference to a dedicated text field on the document node
  const textNode = gun.get('p2peditor').get('document').get('text');

  // Keep track of last value we pushed locally to avoid echo updates
  let lastSent = '';

  // Listen for remote updates
  textNode.on((data) => {
    if (typeof data !== 'string') return;
    if (data === lastSent || data === content.value) return;
    content.value = data;
  });

  // Persist local edits
  watch(content, (newVal) => {
    if (newVal === lastSent) return; // Already pushed
    lastSent = newVal;
    textNode.put(newVal);
  });

  return { content };
});
