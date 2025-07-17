<template>
  <q-page class="q-pa-md flex flex-center column">
    <!-- Auth Form -->
    <q-form @submit.prevent="signIn" class="q-gutter-md" style="width: 320px">
      <q-input v-model="alias" label="Username" outlined dense data-cy="input-username" />
      <q-input
        v-model="pass"
        label="Passphrase"
        type="password"
        outlined
        dense
        data-cy="input-pass"
      />

      <div class="row justify-between q-gutter-sm">
        <q-btn
          label="Sign In"
          color="primary"
          type="submit"
          no-caps
          class="col"
          data-cy="btn-signin"
        />
        <q-btn
          label="Sign Up"
          color="secondary"
          @click="signUp"
          no-caps
          class="col"
          data-cy="btn-signup"
        />
      </div>
    </q-form>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { gun } from 'boot/vueGun';
import { useAuthStore } from '../stores/AuthStore';
import { storeToRefs } from 'pinia';

export interface Message {
  id: string;
  from: string;
  text: string;
}

const authStore = useAuthStore();
const { alias, pass } = storeToRefs(authStore);
const { signIn, signUp } = authStore;

const messages = ref<Message[]>([]);

const chat = gun.get('chat');

onMounted(() => {
  chat.map().once((data: Partial<Message> | undefined, id: string) => {
    if (data && data.text) {
      messages.value.push({ id, from: data.from ?? 'anon', text: data.text });
    }
  });
});
</script>
