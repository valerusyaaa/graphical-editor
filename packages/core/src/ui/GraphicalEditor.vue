<script setup lang="ts">
import type { Viewport } from "pixi-viewport";
import {
	BaseTool,
	useGraphicSchemeStore,
	useRenderSchema,
	type ITool,
} from "..";
import { Application, CullerPlugin, extensions } from "pixi.js";
import {
	onMounted,
	nextTick,
	shallowRef,
	toRef,
	ref,
	onUnmounted,
	markRaw,
} from "vue";
import { GraphicObjectDto, ObjectDescription } from "../api";

const props = defineProps<{
	objects: GraphicObjectDto<any>[];
	descriptions: ObjectDescription[];
	tool?: ITool;
	winRef: HTMLDivElement | any;
}>();

extensions.add(CullerPlugin);
const { renderSchema } = useRenderSchema(
	toRef(() => props.objects),
	toRef(() => props.descriptions),
);
const graphicSchemeStore = useGraphicSchemeStore();

const appContainer = ref<HTMLDivElement | null>(null);
const app = shallowRef<Application | null>(null);
const winRef = toRef(() => props.winRef as HTMLDivElement);

const viewport = shallowRef<Viewport>();
onMounted(async () => {
	await nextTick();
	if (props.tool) {
		graphicSchemeStore.tool = props.tool;
	} else {
		graphicSchemeStore.tool = new BaseTool();
	}
	app.value = new Application();
	await app.value.init({
		resizeTo: props.winRef,
		backgroundColor: graphicSchemeStore.backroundColor,
		antialias: true,
		preference: "webgl",
	});
	appContainer.value?.appendChild(app.value.canvas);

	setTimeout(async () => {
		if (app.value) {
			if (graphicSchemeStore.preRenderCbs) {
				for (const preRenderCb of graphicSchemeStore.preRenderCbs) {
					await preRenderCb();
				}
			}
			viewport.value = renderSchema(app.value);
			graphicSchemeStore.app = markRaw(app.value);
			if (graphicSchemeStore.postRenderCbs) {
				for (const postRenderCb of graphicSchemeStore.postRenderCbs) {
					await postRenderCb();
				}
			}
		}
	}, 200);
});

onUnmounted(() => {});

// useResizeObserver(winRef.value, () => {
// 	if (app.value?.resize) {
// 		((app.value.resizeTo = winRef.value as HTMLDivElement),
// 			app.value?.resize());
// 	}
// 	viewport.value?.resize(
// 		app.value?.canvas.width,
// 		app.value?.canvas.height,
// 	);
// });
</script>
<template>
	<div
		ref="appContainer"
		:style="{ width: '1000px', height: '1000px' }"
		class="pixi-container"
	></div>
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
