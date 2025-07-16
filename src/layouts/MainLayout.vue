<template>
  <q-layout view="hHh lpR fFf">
    <q-header elevated class="bg-primary text-white">
      <q-toolbar>
        <q-toolbar-title> P2P Editor </q-toolbar-title>
      </q-toolbar>
      <template v-if="!networkStore.isOnline">
        <q-banner dense class="bg-orange text-white" style="border-radius: 0">
          <template #avatar>
            <q-icon name="wifi_off" />
          </template>
          You are offline. Changes will be saved locally and synced when connection is restored.
        </q-banner>
      </template>
    </q-header>
    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { useNetworkStore } from '../stores/NetworkStore';

const networkStore = useNetworkStore();
</script>
