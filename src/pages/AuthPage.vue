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

      <q-file
        v-model="recoveryFile"
        label="Recovery File (JSON)"
        outlined
        dense
        accept="application/json"
        data-cy="input-recovery-file"
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
        <q-btn
          label="Recover"
          color="positive"
          @click="recover"
          no-caps
          class="col"
          :disable="!recoveryFile"
          data-cy="btn-recover"
        />
      </div>
    </q-form>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
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
const { signIn, signUp, recoverLogin } = authStore;

// Recovery file handling
const recoveryFile = ref<File | null>(null);
const recoveryFileContent = ref<string | null>(null);

watch(recoveryFile, (file) => {
  if (!file) {
    recoveryFileContent.value = null;
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    recoveryFileContent.value = (e.target?.result as string) ?? null;
  };
  reader.readAsText(file);
});

function recover() {
  recoverLogin(recoveryFileContent.value, alias.value, pass.value);
}

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
