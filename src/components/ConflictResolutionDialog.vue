<template>
  <q-dialog v-model="isOpen" persistent maximized>
    <q-card class="fit column">
      <q-card-section class="row items-center bg-warning text-dark">
        <q-icon name="warning" class="q-mr-sm" />
        <div class="text-h6">Resolve Conflicting Changes</div>
      </q-card-section>
      <q-separator />

      <q-card-section v-if="hasLines" class="scroll" style="flex: 1">
        <div class="column q-gutter-xs">
          <div
            v-for="(row, idx) in lineData"
            :key="idx"
            class="row items-start q-col-gutter-xs"
            :class="row.diff ? 'bg-amber-2' : ''"
          >
            <div class="col-shrink text-caption text-grey-7" style="width: 40px">{{ idx + 1 }}</div>

            <div class="col-5">
              <pre
                style="margin: 0; white-space: pre-wrap; font-family: monospace"
                v-html="row.remoteHtml"
              ></pre>
            </div>

            <div class="col-auto flex flex-center" style="width: 60px">
              <template v-if="row.diff">
                <q-btn-toggle
                  v-model="choices[row.diffIndex!]"
                  dense
                  unelevated
                  size="sm"
                  color="primary"
                  :options="[
                    { label: '←', value: 'remote', tooltip: 'Use remote' },
                    { label: '→', value: 'local', tooltip: 'Use local' },
                  ]"
                />
              </template>
            </div>

            <div class="col-5">
              <pre
                style="margin: 0; white-space: pre-wrap; font-family: monospace"
                v-html="row.localHtml"
              ></pre>
            </div>
          </div>
        </div>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn flat label="Use Remote" color="primary" @click="onAcceptRemote" />
        <q-btn flat label="Keep Local" color="primary" @click="onKeepLocal" />
        <q-btn flat label="Merge Selection" color="positive" :disable="!hasDiff" @click="onMerge" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useEditorStore } from '../stores/EditorStore';
import DiffMatchPatch from 'diff-match-patch';

const dmp = new DiffMatchPatch();

const editorStore = useEditorStore();

const isOpen = computed({
  get: () => !!editorStore.conflict,
  set: (v: boolean) => {
    if (!v && editorStore.conflict) editorStore.acceptRemote();
  },
});

const localLines = computed(() => (editorStore.conflict?.local || '').split(/\n/));
const remoteLines = computed(() => (editorStore.conflict?.remote || '').split(/\n/));

interface LineMeta {
  local: string;
  remote: string;
  diff: boolean;
  diffIndex: number | null;
  localHtml: string;
  remoteHtml: string;
}

const lineData = computed<LineMeta[]>(() => {
  const max = Math.max(localLines.value.length, remoteLines.value.length);
  const res: LineMeta[] = [];
  let dIdx = 0;
  for (let i = 0; i < max; i++) {
    const local = localLines.value[i] ?? '';
    const remote = remoteLines.value[i] ?? '';

    const diffs = dmp.diff_main(remote, local);
    dmp.diff_cleanupSemantic(diffs);

    let remoteHtml = '';
    let localHtml = '';
    for (const [op, text] of diffs as [number, string][]) {
      const safe = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      if (op === -1) {
        remoteHtml += `<span class="bg-red-3">${safe}</span>`;
      } else if (op === 1) {
        localHtml += `<span class="bg-green-3">${safe}</span>`;
      } else {
        remoteHtml += safe;
        localHtml += safe;
      }
    }

    const isDiff = remote !== local;
    res.push({
      local,
      remote,
      diff: isDiff,
      diffIndex: isDiff ? dIdx++ : null,
      localHtml,
      remoteHtml,
    });
  }
  return res;
});

const diffCount = computed(() => lineData.value.filter((l) => l.diff).length);
const choices = ref<string[]>([]);

watch(
  diffCount,
  (cnt) => {
    choices.value = Array(cnt).fill('local');
  },
  { immediate: true },
);

const hasLines = computed(() => lineData.value.length > 0);
const hasDiff = computed(() => diffCount.value > 0);

function onKeepLocal() {
  editorStore.keepLocal();
}

function onAcceptRemote() {
  editorStore.acceptRemote();
}

function onMerge() {
  const mergedLines: string[] = [];
  for (const row of lineData.value) {
    if (!row.diff) {
      mergedLines.push(row.local); // same as remote
    } else if (row.diffIndex !== null) {
      mergedLines.push(choices.value[row.diffIndex] === 'remote' ? row.remote : row.local);
    }
  }
  const mergedText = mergedLines.join('\n');
  editorStore.applyMerge(mergedText);
}
</script>
