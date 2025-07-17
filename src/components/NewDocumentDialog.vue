<template>
  <q-dialog v-model="dialogStore.newDocumentDialog">
    <q-card>
      <q-card-section>
        <div class="text-h6">Create Document</div>
      </q-card-section>
      <q-card-section>
        <q-input v-model="title" label="Title" data-cy="input-new-title" />
      </q-card-section>
      <q-card-actions align="right">
        <q-btn flat label="Cancel" @click="dialogStore.closeNewDocumentDialog()" />
        <q-btn flat label="Create" color="primary" @click="handleCreate" data-cy="btn-create-doc" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useDialogStore } from '../stores/DialogStore';

interface Emits {
  (e: 'create', title: string): void;
}

const emit = defineEmits<Emits>();
const dialogStore = useDialogStore();

const title = ref('');

// Reset title when dialog opens
watch(
  () => dialogStore.newDocumentDialog,
  (newValue) => {
    if (newValue) {
      title.value = '';
    }
  },
);

function handleCreate() {
  emit('create', title.value || 'Untitled');
  dialogStore.closeNewDocumentDialog();
}
</script>
