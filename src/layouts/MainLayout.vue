<template>
  <q-layout view="hHh lpR fFf">
    <q-header elevated class="bg-primary text-white">
      <Navbar />
      <template v-if="!networkStore.isOnline">
        <q-banner
          dense
          class="bg-orange text-white"
          style="border-radius: 0"
          data-cy="offline-banner"
        >
          <template #avatar>
            <q-icon name="wifi_off" />
          </template>
          {{ bannerText }}
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
import { useRoute } from 'vue-router';
import { computed } from 'vue';
import Navbar from '../components/NavBar.vue';

const networkStore = useNetworkStore();
const route = useRoute();

const bannerText = computed(() =>
  route.name === 'auth'
    ? 'You are offline. Sign in may be unavailable.'
    : 'You are offline. Changes will be saved locally and synced when connection is restored.',
);
</script>
