import { defineStore } from 'pinia';
import { ref } from 'vue';

interface Document {
  id: string;
  title: string;
}

export const useDialogStore = defineStore('dialog', () => {
  // Dialog visibility states
  const newDocumentDialog = ref(false);
  const renameDocumentDialog = ref(false);
  const shareDocumentDialog = ref(false);
  const deleteDocumentDialog = ref(false);

  // Dialog data
  const renameDocument = ref<Document | null>(null);
  const shareDocument = ref<Document | null>(null);
  const deleteDocument = ref<Document | null>(null);

  // Actions
  function openNewDocumentDialog() {
    newDocumentDialog.value = true;
  }

  function closeNewDocumentDialog() {
    newDocumentDialog.value = false;
  }

  function openRenameDocumentDialog(document: Document) {
    renameDocument.value = document;
    renameDocumentDialog.value = true;
  }

  function closeRenameDocumentDialog() {
    renameDocumentDialog.value = false;
    renameDocument.value = null;
  }

  function openShareDocumentDialog(document: Document) {
    shareDocument.value = document;
    shareDocumentDialog.value = true;
  }

  function closeShareDocumentDialog() {
    shareDocumentDialog.value = false;
    shareDocument.value = null;
  }

  function openDeleteDocumentDialog(document: Document) {
    deleteDocument.value = document;
    deleteDocumentDialog.value = true;
  }

  function closeDeleteDocumentDialog() {
    deleteDocumentDialog.value = false;
    deleteDocument.value = null;
  }

  return {
    // States
    newDocumentDialog,
    renameDocumentDialog,
    shareDocumentDialog,
    deleteDocumentDialog,
    renameDocument,
    shareDocument,
    deleteDocument,

    // Actions
    openNewDocumentDialog,
    closeNewDocumentDialog,
    openRenameDocumentDialog,
    closeRenameDocumentDialog,
    openShareDocumentDialog,
    closeShareDocumentDialog,
    openDeleteDocumentDialog,
    closeDeleteDocumentDialog,
  };
});
