<script setup lang="ts">
import type { Viewport } from "pixi-viewport";
import { useGraphicSchemeStore, useRenderSchema, useSelectionArea, type ITool } from "..";
import { Application, CullerPlugin, extensions } from "pixi.js";
import { useTooltip } from "../composables/use-tooltip";
import Tooltip from "./Tooltip.vue";
import type { MenuItem } from "primevue/menuitem";
import { loadFonts } from "@/pages/windows/schema/lib";

const props = defineProps<{
    tool?: ITool;
    winRef: HTMLDivElement | any;
}>();
extensions.add(CullerPlugin);
const { renderSchema } = useRenderSchema();
const graphicSchemeStore = useGraphicSchemeStore();
//TODO Добить рамку выделения объектов
const { onInitSelectionArea } = useSelectionArea();

const tooltipGraphicScheme = useTooltip();
const tooltip = toRef(() => tooltipGraphicScheme.tooltip);

const appContainer = ref<HTMLDivElement | null>(null);
const app = shallowRef<Application | null>(null);
const winRef = toRef(() => props.winRef as HTMLDivElement);

const contextMenu = ref();
const itemsContextMenu = computed<MenuItem[]>(() => graphicSchemeStore.tool.itemsContextMenu as MenuItem[]);

const viewport = shallowRef<Viewport>();
onMounted(async () => {
    await nextTick();
    if (props.tool) {
        graphicSchemeStore.tool = props.tool;
    }
    app.value = new Application();
    await app.value.init({
        resizeTo: props.winRef,
        backgroundColor: graphicSchemeStore.backroundColor,
        antialias: true,
        preference: "webgl",
    });
    appContainer.value?.appendChild(app.value.canvas);
    graphicSchemeStore.tooltipManager = tooltipGraphicScheme;

    setTimeout(async () => {
        if (app.value) {
            if (graphicSchemeStore.preRenderCbs) {
                for (const preRenderCb of graphicSchemeStore.preRenderCbs) {
                    await preRenderCb();
                }
            }
            await loadFonts();
            viewport.value = renderSchema(app.value);
            graphicSchemeStore.app = markRaw(app.value);
            graphicSchemeStore.tool.contextMenu = contextMenu.value;
            onInitSelectionArea(viewport.value);
            if (graphicSchemeStore.postRenderCbs) {
                for (const postRenderCb of graphicSchemeStore.postRenderCbs) {
                    await postRenderCb();
                }
            }
            graphicSchemeStore.tool.useHotKeys(appContainer);
        }
    }, 200);
});

onUnmounted(() => {
    graphicSchemeStore.clearStore();
});

useResizeObserver(winRef.value, () => {
    if (app.value?.resize) {
        ((app.value.resizeTo = winRef.value as HTMLDivElement), app.value?.resize());
    }
    viewport.value?.resize(app.value?.canvas.width, app.value?.canvas.height);
});
</script>
<template>
    <div ref="appContainer" class="pixi-container"></div>
    <PrimeContextMenu ref="contextMenu" :model="itemsContextMenu">
        <template #item="{ item }">
            <div v-ripple class="flex items-center gap-3 p-1 cursor-pointer w-72">
                <Icon v-if="item.icon" :name="item.icon" :class="item.class" size="16" />
                <span class="flex-1">{{ item.label }} </span>
                <span class="ml-6 text-gray-500">{{ item.url }}</span>
            </div>
        </template>
    </PrimeContextMenu>
</template>
<style scoped>
.pixi-container {
    position: relative;
    overflow: hidden;
}

canvas {
    display: block;
    outline: none;
}
</style>
