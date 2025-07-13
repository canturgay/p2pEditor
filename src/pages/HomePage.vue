<template>
  <q-page class="flex flex-center column">
    <q-banner class="bg-positive text-white q-pa-md">
      Authentication was successful: {{ ackJson }}
    </q-banner>
  </q-page>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useAuthStore } from '../stores/AuthStore';

const authStore = useAuthStore();

const ackJson = computed(() => JSON.stringify(authStore.ackData ?? {}, null, 2));
</script>
