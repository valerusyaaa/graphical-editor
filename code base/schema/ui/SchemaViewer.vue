<script setup lang="ts">
import { FullSkeleton } from "@/shared/common";
import { useDataScheme, createGraphicObjectDnd, useRefreshContentSchema, createGraphicObjectsEditor } from "../lib";
import { GraphicalEditor, useDragAndDrop, useGraphicSchemeStore } from "@/shared/graphical-editor";
import { useSelectedObjectStore } from "@/entities/select-object";
import { EditingSchemaTool } from "../model";
import { useLabelEditorStore } from "@/pages/panels";
import LabelAppender from "./LabelAppender.vue";
import ToolScheme from "./ToolScheme.vue";

const winRef = ref();
const { isLoading } = useDataScheme();
const selectedObjectStore = useSelectedObjectStore();
const labelEditorStore = useLabelEditorStore();
const { onDragOver, onDrop, onDragLeave, isDragOver, onCreateObjectDnd } = useDragAndDrop();
onCreateObjectDnd(createGraphicObjectDnd);

useRefreshContentSchema();
const graphicSchemeStore = useGraphicSchemeStore();
const editingTool = ref(new EditingSchemaTool());
const appenderLableItem = toRef(() => editingTool.value.appenderLabels);

onMounted(async () => {
    graphicSchemeStore.onCreateObjectsForPaste(createGraphicObjectsEditor);
});

graphicSchemeStore.$onAction(action => {
    if (action.name === "clearSelectionObjects") {
        selectedObjectStore.setSelectedObject(undefined);
        labelEditorStore.setSelectedLabel(undefined);
    }
});
</script>
<template>
    <div
        ref="winRef"
        class="relative w-full h-full"
        @dragover="onDragOver"
        @drop="onDrop"
        @dragleave="onDragLeave"
        :style="{
            backgroundColor: isDragOver() ? 'rgba(15,89,58,0.48)' : 'transparent',
            transition: 'background-color 0.2s ease',
        }"
    >
        <ToolScheme />
        <div v-if="isLoading" class="w-full h-full p-4">
            <FullSkeleton />
        </div>

        <GraphicalEditor v-else :win-ref="winRef" :tool="editingTool">
            <template #tooltip="{ object }">
                <HintViewer v-if="object" :data="object" />
            </template>
        </GraphicalEditor>
        <LabelAppender v-if="appenderLableItem" :appender-lable-item="appenderLableItem" />
    </div>
</template>
