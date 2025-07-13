<template>
  <q-page class="q-pa-md">
    <q-editor v-model="editorStore.content" />
  </q-page>
</template>

<script setup lang="ts">
import { useEditorStore } from '../stores/EditorStore';
const editorStore = useEditorStore();
</script>
