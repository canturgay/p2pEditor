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

  // Restore state if session already authenticated
  if (user.is?.pub) {
    user.get('alias').once((a) => {
      if (typeof a === 'string') alias.value = a;
    });
    isAuthenticated.value = true;
  }

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
    // Clear credentials so that recovery edge-case tests start with empty inputs
    alias.value = '';
    pass.value = '';
    router.push('/').catch((e) => {
      console.error(e);
    });
    Notify.create({
      type: 'info',
      message: 'Logged out.',
    });
  }

  function downloadRecoveryFile() {
    // Allow users to export their key-pair & alias as a recovery file.
    if (!isAuthenticated.value) {
      Notify.create({
        type: 'negative',
        message: 'You must be signed in to generate a recovery file.',
      });
      return;
    }

    // The SEA key-pair is stored on the user instance after auth.
    const pair = (user as unknown as { _?: { sea?: unknown } })._?.sea || ackData.value?.sea;
    if (!pair) {
      Notify.create({
        type: 'negative',
        message: 'Could not locate key-pair on the user object.',
      });
      return;
    }

    const recoveryData = {
      alias: alias.value,
      keys: pair,
    };

    const blob = new Blob([JSON.stringify(recoveryData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${alias.value}_recovery.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Attempt to authenticate using a previously downloaded recovery file.
   * The user must supply the recovery file plus EITHER their alias OR their passphrase.
   *
   * @param recoveryFileContent Raw text content of the uploaded recovery JSON file.
   * @param providedAlias Optional alias entered by the user.
   * @param providedPass Optional passphrase entered by the user.
   */
  function recoverLogin(
    recoveryFileContent: string | null,
    providedAlias: string | null,
    providedPass: string | null,
  ) {
    if (!recoveryFileContent) {
      Notify.create({ type: 'negative', message: 'Please select a recovery file.' });
      return;
    }

    Loading.show({ message: 'Recovering account…' });

    try {
      const parsed = JSON.parse(recoveryFileContent);
      const fileAlias = parsed.alias as string | undefined;
      const keys = parsed.keys as Record<string, unknown> | undefined;

      if (!fileAlias || !keys) {
        throw new Error('Missing alias or keys in recovery file');
      }

      // CASE 1: User provided their alias → authenticate with key-pair.
      if (providedAlias && providedAlias.length > 0) {
        if (providedAlias !== fileAlias) {
          Notify.create({
            type: 'warning',
            message:
              'Provided alias does not match alias stored in recovery file. Proceeding with file alias.',
          });
        }
        const pair = keys as { pub: string; priv: string; epub: string; epriv: string };
        user.auth(pair, (ack: Ack) => {
          if (ack.err) {
            Loading.hide();
            Notify.create({ type: 'negative', message: `Recovery error: ${ack.err}` });
          }
        });
        return;
      }

      // CASE 2: User provided their passphrase → authenticate with alias from file.
      if (providedPass && providedPass.length > 0) {
        user.auth(fileAlias, providedPass, (ack: Ack) => {
          if (ack.err) {
            Loading.hide();
            Notify.create({ type: 'negative', message: `Recovery error: ${ack.err}` });
          }
        });
        return;
      }

      // Neither alias nor pass provided.
      Loading.hide();
      Notify.create({
        type: 'negative',
        message: 'Please provide either your username OR your passphrase to recover your account.',
      });
    } catch (e) {
      console.error(e);
      Loading.hide();
      Notify.create({ type: 'negative', message: 'Invalid recovery file.' });
    }
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
    downloadRecoveryFile,
    recoverLogin,
  };
});

// @ts-expect-error hot module replacement
if (import.meta.hot) {
  // @ts-expect-error hot module replacement
  import.meta.hot.accept(acceptHMRUpdate(useAuthStore, import.meta.hot));
}
