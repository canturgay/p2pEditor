<template>
  <q-toolbar>
    <q-toolbar-title> P2P Editor </q-toolbar-title>
    <q-btn
      color="negative"
      v-if="authStore.isAuthenticated"
      label="Logout"
      @click="authStore.logout"
    />
    <q-btn
      color="secondary"
      v-if="authStore.isAuthenticated"
      label="Download Recovery"
      @click="authStore.downloadRecoveryFile"
      class="q-ml-sm"
      data-cy="btn-download-recovery"
    />
  </q-toolbar>
</template>

<script setup lang="ts">
import { useAuthStore } from '../stores/AuthStore';

const authStore = useAuthStore();
</script>
