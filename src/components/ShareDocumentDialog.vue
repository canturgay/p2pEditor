<template>
  <q-dialog v-model="dialogStore.shareDocumentDialog">
    <q-card>
      <q-card-section>
        <div class="text-h6">Share Document</div>
      </q-card-section>
      <q-card-section class="column">
        <q-input v-model="alias" label="User alias" class="q-mb-md" data-cy="input-share-alias" />
        <q-select
          v-model="role"
          :options="roleOptions"
          label="Permission"
          data-cy="select-share-role"
        />
      </q-card-section>
      <q-card-actions align="right">
        <q-btn flat label="Cancel" @click="dialogStore.closeShareDocumentDialog()" />
        <q-btn flat label="Share" color="primary" @click="handleShare" data-cy="btn-share-doc" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useDialogStore } from '../stores/DialogStore';

interface Emits {
  (e: 'share', id: string, alias: string, role: 'editor' | 'viewer'): void;
}

const emit = defineEmits<Emits>();
const dialogStore = useDialogStore();

const alias = ref('');
const role = ref<'editor' | 'viewer'>('editor');
const roleOptions = [
  { label: 'Can Edit', value: 'editor' },
  { label: 'View Only', value: 'viewer' },
];

// Reset form when dialog opens
watch(
  () => dialogStore.shareDocumentDialog,
  (newValue) => {
    if (newValue) {
      alias.value = '';
      role.value = 'editor';
    }
  },
);

function handleShare() {
  if (dialogStore.shareDocument && alias.value) {
    emit('share', dialogStore.shareDocument.id, alias.value, role.value);
    dialogStore.closeShareDocumentDialog();
  }
}
</script>
