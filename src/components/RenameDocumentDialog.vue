<template>
  <q-dialog v-model="dialogStore.renameDocumentDialog">
    <q-card>
      <q-card-section>
        <div class="text-h6">Rename Document</div>
      </q-card-section>
      <q-card-section>
        <q-input v-model="title" label="Title" />
      </q-card-section>
      <q-card-actions align="right">
        <q-btn flat label="Cancel" @click="dialogStore.closeRenameDocumentDialog()" />
        <q-btn flat label="Save" color="primary" @click="handleSave" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useDialogStore } from '../stores/DialogStore';

interface Emits {
  (e: 'save', id: string, title: string): void;
}

const emit = defineEmits<Emits>();
const dialogStore = useDialogStore();

const title = ref('');

// Update title when document changes
watch(
  () => dialogStore.renameDocument,
  (newDocument) => {
    if (newDocument) {
      title.value = newDocument.title;
    }
  },
  { immediate: true },
);

function handleSave() {
  if (dialogStore.renameDocument) {
    emit('save', dialogStore.renameDocument.id, title.value);
    dialogStore.closeRenameDocumentDialog();
  }
}
</script>
