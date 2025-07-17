<template>
  <q-dialog v-model="dialogStore.deleteDocumentDialog">
    <q-card>
      <q-card-section class="text-h6">Delete Document</q-card-section>
      <q-card-section>
        Are you sure you want to delete "{{ dialogStore.deleteDocument?.title }}"? This action
        cannot be undone.
      </q-card-section>
      <q-card-actions align="right">
        <q-btn flat label="Cancel" @click="dialogStore.closeDeleteDocumentDialog()" />
        <q-btn
          flat
          label="Delete"
          color="negative"
          @click="handleDelete"
          data-cy="btn-delete-doc"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { useDialogStore } from '../stores/DialogStore';

interface Emits {
  (e: 'delete', id: string): void;
}

const emit = defineEmits<Emits>();
const dialogStore = useDialogStore();

function handleDelete() {
  if (dialogStore.deleteDocument) {
    emit('delete', dialogStore.deleteDocument.id);
    dialogStore.closeDeleteDocumentDialog();
  }
}
</script>
