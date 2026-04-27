<script setup lang="ts">
import { useDragAndDrop } from "@/shared/graphical-editor";
import { getGraphicObjectItems, type ItemsScheme } from "@/pages/panels";
import { openSchemeViewer } from "@/features/open-scheme-viewer";
import { PopupMenu } from "@/shared/common";
import type { MenuItem } from "primevue/menuitem";
import { dtAccordion } from "@/shared/primevue";
import { useAppMode } from "@/features/app-mode";
import { useI18n } from "vue-i18n";
import { Panel } from "@/shared/common";

const { t } = useI18n();

const { onDragStart } = useDragAndDrop();
const appMode = useAppMode();
const dt = ref(dtAccordion());
const itemsObject = ref<ItemsScheme[]>(getGraphicObjectItems());
const itemsMenu = computed<MenuItem[]>(() => [
    {
        label: t("pages.panels.tools.orientObjectsAutomatically"),
        icon: "fluent:arrow-flow-up-right-20-regular",
        command: () => {
            //TODO: Coordinate objects by flow direction
        },
    },
    {
        label: t("pages.panels.tools.orientObjectsByFlowDirection"),
        icon: "fluent:arrow-shuffle-20-regular",
        command: () => {
            //TODO: Coordinate objects by flow direction
        },
    },
]);
</script>

<template>
    <Panel :header="t('pages.panels.tools.title')">
        <template #header-toolbar>
            <div class="flex items-center gap-2">
                <PrimeButton
                    v-tooltip.bottom="{ value: appMode !== 'Empty' ? '' : t('pages.panels.tools.projectNotLoaded') }"
                    :label="t('pages.panels.tools.showScheme')"
                    @click="openSchemeViewer()"
                    size="small"
                    variant="outlined"
                    severity="secondary"
                    :disabled="appMode === 'Empty'"
                />
                <PopupMenu :menuItems="itemsMenu" :disabled="appMode !== 'Editor'" />
            </div>
        </template>
        <template #content>
            <PrimeAccordion
                v-if="appMode !== 'Empty'"
                class="!bg-canvas min-h-0 overflow-y-auto"
                :value="[0, 1, 2, 3, 4, 5]"
                :dt="dt"
                multiple
            >
                <PrimeAccordionPanel v-for="(item, index) in itemsObject" :key="item.headerPanel" :value="index">
                    <PrimeAccordionHeader class="text-semibold !bg-canvas">
                        {{ item.headerPanel }}
                    </PrimeAccordionHeader>
                    <PrimeAccordionContent>
                        <div class="flex flex-wrap items-center px-3 gap-2">
                            <div
                                v-for="itemObj in item.items"
                                v-tooltip.bottom="{ value: itemObj.title }"
                                :class="['item-tool', { active: appMode !== 'Viewer' }]"
                                class=""
                                :key="itemObj.typeObj"
                                :draggable="appMode !== 'Viewer'"
                                @dragstart="onDragStart($event, itemObj.typeObj, itemObj.info)"
                            >
                                <component :is="itemObj.component" v-bind:symbol="itemObj.symbol" />
                            </div>
                        </div>
                    </PrimeAccordionContent>
                </PrimeAccordionPanel>
            </PrimeAccordion>
        </template>
    </Panel>
</template>

<style scoped>
.item-tool {
    @apply border rounded-sm border-surface-600 flex items-center justify-center min-w-[50px] min-h-[50px];
}
.item-tool.active {
    @apply hover:bg-gray-700;
}
</style>
