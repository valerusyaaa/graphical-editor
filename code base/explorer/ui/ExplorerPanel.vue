<script setup lang="ts">
import type { TreeNode } from "primevue/treenode";
import type { MenuItem } from "primevue/menuitem";
import { getNodes } from "../api";
import { useProjectsStore } from "@/entities/projects";
import { useSelectedObjectStore } from "@/entities/select-object";
import { openSchemeViewer } from "@/features/open-scheme-viewer";
import { findSelectedNode } from "@/pages/panels/explorer/lib/helper";
import { uuid } from "@primeuix/utils";
import { focusSelectObject } from "@/features/focus-graphic-object";
import { openVolumesViewer } from "@/features/open-volumes-viewer";
import { useAppMode } from "@/features/app-mode";
import { openScenarioViewer } from "@/features/scenario";
import { useI18n } from "vue-i18n";
import { Panel } from "@/shared/common";

const { t } = useI18n();

const nodes = shallowRef<TreeNode[] | undefined>();

const projectStore = useProjectsStore();
const isShowDialogImportHistoricalDataToRegime = ref(false);
const appMode = useAppMode();

onMounted(async () => {
    refresh();
});

watch(
    () => projectStore.projectId,
    () => {
        refresh();
    }
);

async function refresh() {
    nodes.value = await getNodes();
}

const menu = ref();
const toggle = (event: Event) => {
    menu.value.toggle(event);
};

const menuItems = computed<MenuItem[]>(() => [
    {
        label: t("pages.panels.explorer.refresh"),
        icon: "pi pi-refresh",
        command: async () => {
            await refresh();
        },
    },
    {
        label: t("pages.panels.explorer.importHistoricalDataToRegime"),
        icon: "pi pi-file-arrow-up",
        command: async () => {
            isShowDialogImportHistoricalDataToRegime.value = true;
        },
        disabled: () => appMode.value === "Viewer",
    },
    {
        separator: true,
    },
    {
        label: t("pages.panels.explorer.openScenarioPlan"),
        icon: "pi pi-calendar",
        command: async () => {
            await openScenarioViewer();
        },
    },
    {
        label: t("pages.panels.explorer.openVolumeTable"),
        icon: "pi pi-table",
        command: async () => {
            await openVolumesViewer();
        },
    },
]);

const selectObjectStore = useSelectedObjectStore();
const selectedObject = ref({});
const selectedNode = ref<TreeNode>();
const onSelectObject = (node: TreeNode) => {
    const newId = node.data.id as number;
    selectObjectStore.setSelectedObject(
        selectObjectStore.selectedObjectId !== newId ? { id: newId, type: node.data.type } : undefined
    );
    selectedNode.value = node;
};

const expandedObjects = ref({});
const guidNode = ref(uuid());
const isShowSync = computed(
    () =>
        selectObjectStore.selectedObjectId !== undefined &&
        selectObjectStore.selectedObjectId !== selectedNode.value?.data.id
);
async function onSyncSelectedObject() {
    if (selectObjectStore.selectedObjectId !== undefined && nodes.value) {
        const { selectedKey, expandKey } = findSelectedNode(nodes.value, selectObjectStore.selectedObjectId);
        expandedObjects.value = expandKey;
        selectedObject.value = selectedKey;
        await nextTick();
        const element = document.getElementById(guidNode.value);
        await nextTick();
        if (element) {
            element.scrollIntoView({
                behavior: "smooth",
                block: "center",
            });
        }
    }
}

async function onDblClickNode() {
    await focusSelectObject(selectedNode?.value!.data.id);
}
</script>

<template>
    <Panel :header="t('pages.panels.explorer.title')">
        <template #header-toolbar>
            <div class="flex items-center gap-2">
                <PrimeButton
                    v-if="isShowSync"
                    v-tooltip="{ value: t('pages.panels.explorer.syncSelectedObject') }"
                    size="small"
                    text
                    @click="onSyncSelectedObject"
                >
                    <Icon name="fluent:arrow-sync-16-filled" class="text-gray-300" size="16" />
                </PrimeButton>
                <PrimeButton
                    :label="t('pages.panels.explorer.showScheme')"
                    @click="openSchemeViewer()"
                    :disabled="appMode === 'Empty'"
                    size="small"
                    variant="text"
                    severity="secondary"
                />
                <PrimeButton :disabled="appMode === 'Empty'" @click="toggle" style="padding: 2px 4px" size="small" text>
                    <Icon name="fluent:more-vertical-16-regular" class="text-gray-300" size="16" />
                </PrimeButton>
                <PrimeMenu ref="menu" :model="menuItems" popup />
            </div>
        </template>
        <template #content>
            <PrimeTree
                v-if="nodes && nodes.length > 0"
                :value="nodes"
                v-model:expandedKeys="expandedObjects"
                v-model:selection-keys="selectedObject"
                class="flex flex-col flex-auto min-h-0"
                style="padding: 0; background: transparent"
                :filter="true"
                selection-mode="single"
                :meta-key-selection="true"
                @node-select="onSelectObject"
                @dblclick="onDblClickNode"
            >
                <template #default="slotProps">
                    <div :id="slotProps.selected ? guidNode : uuid()" class="flex flex-row items-center gap-2">
                        <Icon v-if="slotProps.node.icon" class="text-gray-300 flex-shrink-0" size="16" :name="slotProps.node.icon" />
                        <span class="truncate">
                            <template v-if="slotProps.node.selectable === false">
                                {{ t(slotProps.node.label!) }}
                            </template>
                            <template v-else>
                                {{ slotProps.node.label }}
                            </template>
                        </span>
                    </div>
                </template>
            </PrimeTree>
            <div v-else class="flex flex-auto items-center justify-center">
                <span class="text-gray-400">{{ t("pages.panels.explorer.noAvailableOptions") }}</span>
            </div>
        </template>
    </Panel>
</template>

<style scoped>
:deep(.p-tree-filter) {
    padding: 0;
    margin: 0 8px 8px 8px;
    border-radius: 0;
}

:deep(.p-tree-filter-input) {
    padding: 4px 8px 4px 8px;
    border-radius: 4px;
    border-width: 1px;
    border-color: #4e5157;
    background: #393b40;
}

:deep(.p-tree-node-label) {
    min-width: 0;
    flex: auto;
}
</style>
