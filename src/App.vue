<template>
  <router-view />
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { useNetworkStore } from './stores/NetworkStore';

const networkStore = useNetworkStore();

onMounted(() => {
  networkStore.init();
});

onUnmounted(() => {
  networkStore.cleanup();
});
</script>
