<template>
  <q-page class="q-pa-md">
    <div v-if="!editorStore.active">
      <div class="row q-mb-md items-center">
        <q-btn color="primary" label="New Document" @click="newDialog = true" class="q-mr-sm" />
        <q-btn outline label="Refresh" @click="docsStore.loadDocuments" />
      </div>
      <q-list bordered separator>
        <q-item v-for="d in docsStore.docs" :key="d.id" clickable>
          <q-item-section @click="openDoc(d.id)">{{ d.title }}</q-item-section>
          <q-item-section side>
            <q-btn dense flat icon="share" @click.stop="openShare(d)" />
            <q-btn dense flat icon="edit" @click.stop="openRename(d)" />
          </q-item-section>
        </q-item>
      </q-list>
    </div>
    <div v-else>
      <q-btn flat icon="arrow_back" class="q-mb-md" @click="editorStore.close" />
      <q-editor v-model="editorStore.content" />
    </div>

    <!-- New document dialog -->
    <q-dialog v-model="newDialog">
      <q-card>
        <q-card-section>
          <div class="text-h6">Create Document</div>
        </q-card-section>
        <q-card-section>
          <q-input v-model="newTitle" label="Title" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn flat label="Create" color="primary" @click="createDoc" v-close-popup />
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
          <q-input v-model="shareAlias" label="User alias" class="q-mb-md" />
          <q-select v-model="shareRole" :options="roleOptions" label="Permission" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn flat label="Share" color="primary" @click="doShare" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useDocumentStore } from '../stores/DocumentStore';
import { useEditorStore } from '../stores/EditorStore';

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
</script>
