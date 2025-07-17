import { defineStore, acceptHMRUpdate } from 'pinia';
import { ref } from 'vue';
import { gun } from 'boot/vueGun';
import { Notify, Loading } from 'quasar';
import { useRouter } from 'vue-router';

interface Ack {
  // Login Success case
  ack?: number;
  back?: object;
  get?: string;
  gun?: object;
  id?: number;
  on?: () => void;
  opt?: object;
  put?: {
    pub: string;
    alias: string;
    epub: string;
  };
  root?: object;
  sea?: {
    pub: string;
    priv: string;
    epub: string;
    epriv: string;
  };
  soul?: string;
  tag?: object;

  // Signup and Delete case
  ok?: number;

  // Signup case
  pub?: string;
  [key: string]: unknown;

  // Error case
  err?: string;
}

export const useAuthStore = defineStore('auth', () => {
  // State
  const alias = ref('');
  const pass = ref('');
  const isAuthenticated = ref(false);
  const ackData = ref<Ack | null>(null);
  const signUpError = ref<string | null>(null);
  const router = useRouter();

  // Gun user instance with session recall to keep user logged in across refreshes
  const user = gun.user();
  user.recall({ sessionStorage: true });

  // Listen for successful authentication events
  gun.on('auth', (ack: Ack) => {
    if (ack.ok !== 0) {
      isAuthenticated.value = true;
      ackData.value = ack;
      Notify.create({
        type: 'positive',
        message: `Successfully signed in. Welcome back ${ack.put?.alias}!`,
      });
      Loading.hide();
      router.push('/home').catch((e) => {
        console.error(e);
      });
    }
  });

  // Actions
  function signIn() {
    Loading.show({
      message: 'Signing in...',
    });
    user.auth(alias.value, pass.value, (ack: Ack) => {
      if (ack.err) {
        Loading.hide();
        Notify.create({
          type: 'negative',
          message: `Sign in error: ${ack.err}`,
        });
        console.error('Sign in error:', ack.err);
      }
    });
  }

  function signUp() {
    // Enforce alias uniqueness before creating user
    signUpError.value = null;
    Loading.show({
      message: 'Signing up...',
    });
    gun.get('~@' + alias.value).once((data: unknown) => {
      if (data) {
        Loading.hide();
        Notify.create({
          type: 'negative',
          message: 'Alias already exists. Please choose another.',
        });
        return;
      }
      // Alias is unique, proceed to create user
      user.create(alias.value, pass.value, (ack: Ack) => {
        if (ack.err) {
          Loading.hide();
          Notify.create({
            type: 'negative',
            message: `Sign up error: ${ack.err}`,
          });
          console.error('Sign up error:', ack.err);
        } else {
          signIn();
          // Ack will be handled by the 'auth' listener above
        }
      });
    });
  }

  function logout() {
    user.leave();
    isAuthenticated.value = false;
    ackData.value = null;
    router.push('/').catch((e) => {
      console.error(e);
    });
    Notify.create({
      type: 'info',
      message: 'Logged out.',
    });
  }

  return {
    alias,
    pass,
    signIn,
    signUp,
    logout,
    isAuthenticated,
    ackData,
    signUpError,
    user, // expose user instance
  };
});

// @ts-expect-error hot module replacement
if (import.meta.hot) {
  // @ts-expect-error hot module replacement
  import.meta.hot.accept(acceptHMRUpdate(useAuthStore, import.meta.hot));
}
