<template>
  <q-page class="q-pa-md">
    <div v-if="!editorStore.active">
      <div class="row q-mb-md items-center">
        <q-btn
          color="primary"
          label="New Document"
          @click="newDialog = true"
          class="q-mr-sm"
          data-cy="btn-new-doc"
        />
        <q-btn outline label="Refresh" @click="docsStore.loadDocuments" data-cy="btn-refresh" />
      </div>
      <q-list bordered separator>
        <q-item v-for="d in docsStore.docs" :key="d.id" clickable :data-doc-id="d.id">
          <q-item-section @click="openDoc(d.id)" data-cy="doc-item-title">{{
            d.title
          }}</q-item-section>
          <q-item-section side>
            <q-btn dense flat icon="share" @click.stop="openShare(d)" data-cy="icon-share-doc" />
            <q-btn dense flat icon="edit" @click.stop="openRename(d)" />
            <q-btn
              v-if="d.isOwner"
              dense
              flat
              color="negative"
              icon="delete"
              data-cy="icon-delete-doc"
              @click.stop="openDelete(d)"
            />
          </q-item-section>
        </q-item>
      </q-list>
    </div>
    <div v-else>
      <q-btn flat icon="arrow_back" class="q-mb-md" @click="editorStore.close" data-cy="btn-back" />
      <q-editor v-model="editorStore.content" data-cy="editor" />
    </div>

    <!-- New document dialog -->
    <q-dialog v-model="newDialog">
      <q-card>
        <q-card-section>
          <div class="text-h6">Create Document</div>
        </q-card-section>
        <q-card-section>
          <q-input v-model="newTitle" label="Title" data-cy="input-new-title" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn
            flat
            label="Create"
            color="primary"
            @click="createDoc"
            v-close-popup
            data-cy="btn-create-doc"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Rename dialog -->
    <q-dialog v-model="renameDialog">
      <q-card>
        <q-card-section>
          <div class="text-h6">Rename Document</div>
        </q-card-section>
        <q-card-section>
          <q-input v-model="renameTitle" label="Title" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn flat label="Save" color="primary" @click="saveRename" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Share dialog -->
    <q-dialog v-model="shareDialog">
      <q-card>
        <q-card-section>
          <div class="text-h6">Share Document</div>
        </q-card-section>
        <q-card-section class="column">
          <q-input
            v-model="shareAlias"
            label="User alias"
            class="q-mb-md"
            data-cy="input-share-alias"
          />
          <q-select
            v-model="shareRole"
            :options="roleOptions"
            label="Permission"
            data-cy="select-share-role"
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn
            flat
            label="Share"
            color="primary"
            @click="doShare"
            v-close-popup
            data-cy="btn-share-doc"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Delete confirm dialog -->
    <q-dialog v-model="deleteDialog">
      <q-card>
        <q-card-section class="text-h6">Delete Document</q-card-section>
        <q-card-section>
          Are you sure you want to delete "{{ deleteItem?.title }}"? This action cannot be undone.
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn
            flat
            label="Delete"
            color="negative"
            @click="doDelete"
            v-close-popup
            data-cy="btn-delete-doc"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Conflict Resolution dialog -->
    <ConflictResolutionDialog />
  </q-page>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useDocumentStore } from '../stores/DocumentStore';
import { useEditorStore } from '../stores/EditorStore';
import ConflictResolutionDialog from '../components/ConflictResolutionDialog.vue';

const docsStore = useDocumentStore();
const editorStore = useEditorStore();

function openDoc(id: string) {
  editorStore.openDocument(id).catch((e) => {
    console.error(e);
  });
}

onMounted(() => {
  docsStore.loadDocuments();
});

// dialogs reactive state
const newDialog = ref(false);
const newTitle = ref('');
function createDoc() {
  docsStore.createDocument(newTitle.value || 'Untitled').catch((e) => {
    console.error(e);
  });
  newTitle.value = '';
}

const renameDialog = ref(false);
const renameItem = ref<{ id: string; title: string } | null>(null);
const renameTitle = ref('');
function openRename(d: { id: string; title: string }) {
  renameItem.value = d;
  renameTitle.value = d.title;
  renameDialog.value = true;
}
function saveRename() {
  if (renameItem.value) {
    docsStore.renameDocument(renameItem.value.id, renameTitle.value);
  }
}

const shareDialog = ref(false);
const shareItem = ref<{ id: string; title: string } | null>(null);
const shareAlias = ref('');
const shareRole = ref<'editor' | 'viewer'>('editor');
const roleOptions = [
  { label: 'Can Edit', value: 'editor' },
  { label: 'View Only', value: 'viewer' },
];
function openShare(d: { id: string; title: string }) {
  shareItem.value = d;
  shareAlias.value = '';
  shareRole.value = 'editor';
  shareDialog.value = true;
}
function doShare() {
  if (shareItem.value && shareAlias.value) {
    docsStore.shareDocument(shareItem.value.id, shareAlias.value, shareRole.value);
  }
}

// Delete confirm state & actions
const deleteDialog = ref(false);
const deleteItem = ref<{ id: string; title: string } | null>(null);
function openDelete(d: { id: string; title: string }) {
  deleteItem.value = d;
  deleteDialog.value = true;
}
function doDelete() {
  if (deleteItem.value) {
    docsStore.deleteDocument(deleteItem.value.id);
  }
}
</script>
