<script setup lang="ts">
import type { Viewport } from "pixi-viewport";
import { useGraphicSchemeStore, useRenderSchema, useSelectionArea, type ITool } from "..";
import { Application, CullerPlugin, extensions } from "pixi.js";
import { useTooltip } from "../composables/use-tooltip";

const props = defineProps<{
    tool?: ITool;
    winRef: HTMLDivElement | any;
}>();
extensions.add(CullerPlugin);
const { renderSchema } = useRenderSchema();
const graphicSchemeStore = useGraphicSchemeStore();
//TODO Добить рамку выделения объектов
const { onInitSelectionArea } = useSelectionArea();

const appContainer = ref<HTMLDivElement | null>(null);
const app = shallowRef<Application | null>(null);
const winRef = toRef(() => props.winRef as HTMLDivElement);

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
            viewport.value = renderSchema(app.value);
            graphicSchemeStore.app = markRaw(app.value);
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
