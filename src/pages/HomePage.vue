<template>
  <q-page class="q-pa-md">
    <div v-if="!editorStore.active">
      <div class="row q-mb-md items-center">
        <q-btn
          color="primary"
          label="New Document"
          @click="dialogStore.openNewDocumentDialog()"
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
            <q-btn
              dense
              flat
              icon="share"
              @click.stop="dialogStore.openShareDocumentDialog(d)"
              data-cy="icon-share-doc"
            />
            <q-btn dense flat icon="edit" @click.stop="dialogStore.openRenameDocumentDialog(d)" />
            <q-btn
              v-if="d.isOwner"
              dense
              flat
              color="negative"
              icon="delete"
              data-cy="icon-delete-doc"
              @click.stop="dialogStore.openDeleteDocumentDialog(d)"
            />
          </q-item-section>
        </q-item>
      </q-list>
    </div>
    <div v-else>
      <q-btn flat icon="arrow_back" class="q-mb-md" @click="editorStore.close" data-cy="btn-back" />
      <q-badge v-if="!editorStore.canEdit" color="grey-5" class="q-mb-sm" data-cy="view-only-badge"
        >View Only</q-badge
      >

      <div
        v-if="!editorStore.canEdit"
        class="q-editor__content q-pa-sm bg-grey-2"
        v-html="editorStore.content"
        style="min-height: 10rem; border: 1px solid #ccc; border-radius: 4px"
      />

      <q-editor v-else v-model="editorStore.content" data-cy="editor" />
    </div>

    <!-- New document dialog -->
    <NewDocumentDialog @create="createDoc" />

    <!-- Rename dialog -->
    <RenameDocumentDialog @save="saveRename" />

    <!-- Share dialog -->
    <ShareDocumentDialog @share="doShare" />

    <!-- Delete confirm dialog -->
    <DeleteDocumentDialog @delete="doDelete" />

    <!-- Conflict Resolution dialog -->
    <ConflictResolutionDialog />
  </q-page>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useDocumentStore } from '../stores/DocumentStore';
import { useEditorStore } from '../stores/EditorStore';
import { useDialogStore } from '../stores/DialogStore';
import ConflictResolutionDialog from '../components/ConflictResolutionDialog.vue';
import NewDocumentDialog from '../components/NewDocumentDialog.vue';
import RenameDocumentDialog from '../components/RenameDocumentDialog.vue';
import ShareDocumentDialog from '../components/ShareDocumentDialog.vue';
import DeleteDocumentDialog from '../components/DeleteDocumentDialog.vue';

const docsStore = useDocumentStore();
const editorStore = useEditorStore();
const dialogStore = useDialogStore();

function openDoc(id: string) {
  editorStore.openDocument(id).catch((e) => {
    console.error(e);
  });
}

onMounted(() => {
  docsStore.loadDocuments();
});

// Dialog action handlers
function createDoc(title: string) {
  docsStore.createDocument(title).catch((e) => {
    console.error(e);
  });
}

function saveRename(id: string, title: string) {
  docsStore.renameDocument(id, title);
}

function doShare(id: string, alias: string, role: 'editor' | 'viewer') {
  docsStore.shareDocument(id, alias, role);
}

function doDelete(id: string) {
  docsStore.deleteDocument(id);
}
</script>
