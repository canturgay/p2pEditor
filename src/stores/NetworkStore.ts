import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useNetworkStore = defineStore('network', () => {
  // Reactive online status synced with navigator.onLine
  const isOnline = ref<boolean>(navigator.onLine);

  function updateStatus() {
    isOnline.value = navigator.onLine;
  }

  // Setup / teardown listeners (to be called once, e.g. in a boot file or App.vue)
  function init() {
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
  }

  function cleanup() {
    window.removeEventListener('online', updateStatus);
    window.removeEventListener('offline', updateStatus);
  }

  return { isOnline, init, cleanup };
});
