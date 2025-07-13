import { defineStore, acceptHMRUpdate } from 'pinia';
import { ref } from 'vue';
import { gun } from 'boot/vueGun';

interface Ack {
  err?: string;
  ok?: number;
  [key: string]: unknown;
}

export const useAuthStore = defineStore('auth', () => {
  // State
  const alias = ref('');
  const pass = ref('');
  const isAuthenticated = ref(false);
  const ackData = ref<Ack | null>(null);

  // Gun user instance with session recall to keep user logged in across refreshes
  const user = gun.user();
  user.recall({ sessionStorage: true });

  // Listen for successful authentication events
  gun.on('auth', (ack: Ack) => {
    isAuthenticated.value = true;
    ackData.value = ack;
  });

  // Actions
  function signIn() {
    user.auth(alias.value, pass.value, (ack: Ack) => {
      if (ack.err) {
        console.error('Sign in error:', ack.err);
      }
    });
  }

  function signUp() {
    user.create(alias.value, pass.value, (ack: Ack) => {
      if (ack.err) {
        console.error('Sign up error:', ack.err);
      } else {
        signIn();
        // Ack will be handled by the 'auth' listener above
      }
    });
  }

  function logout() {
    user.leave();
    isAuthenticated.value = false;
    ackData.value = null;
  }

  return {
    alias,
    pass,
    signIn,
    signUp,
    logout,
    isAuthenticated,
    ackData,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAuthStore, import.meta.hot));
}
