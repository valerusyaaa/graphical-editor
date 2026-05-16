<script setup lang="ts">
import type { Viewport } from "pixi-viewport";
import {
	BaseTool,
	useGraphicSchemeStore,
	useRenderSchema,
} from "..";
import type { EditorClipboardBridge } from "../model/stores/editor-clipboard.store";
import { useEditorClipboardStore } from "../model/stores/editor-clipboard.store";
import { Application, CullerPlugin, extensions } from "pixi.js";
import type { GraphicObjectDto, ObjectBaseData, ObjectDescription } from "../api";
import {
	onMounted,
	nextTick,
	shallowRef,
	toRef,
	ref,
	onUnmounted,
	markRaw,
} from "vue";
import SchemaEditorContextMenu from "./SchemaEditorContextMenu.vue";

const objects = defineModel<GraphicObjectDto<ObjectBaseData>[]>("objects", {
	required: true,
});

const props = defineProps<{
	descriptions: ObjectDescription[];
	tool?: BaseTool;
	winRef: HTMLDivElement | any;
}>();

extensions.add(CullerPlugin);
const { renderSchema } = useRenderSchema(objects, toRef(() => props.descriptions));
const graphicSchemeStore = useGraphicSchemeStore();
const clipStore = useEditorClipboardStore();

const appContainer = ref<HTMLDivElement | null>(null);
const app = shallowRef<Application | null>(null);
const winRef = toRef(() => props.winRef as HTMLDivElement);

const viewport = shallowRef<Viewport>();

function createClipboardBridge(): EditorClipboardBridge {
	const gs = useGraphicSchemeStore();
	return {
		getObjects: () => objects.value,
		setObjects: (next) => {
			objects.value = next;
		},
		clientToWorld(clientX: number, clientY: number) {
			const a = gs.app;
			const vp = a?.stage.getChildByLabel("viewport") as Viewport | undefined;
			if (!a?.canvas || !vp) return null;
			const r = a.canvas.getBoundingClientRect();
			return vp.toWorld(clientX - r.left, clientY - r.top);
		},
		getViewportCenterWorld() {
			const a = gs.app;
			const vp = a?.stage.getChildByLabel("viewport") as Viewport | undefined;
			if (!a?.canvas || !vp) return null;
			const r = a.canvas.getBoundingClientRect();
			return vp.toWorld(r.width / 2, r.height / 2);
		},
	};
}

function editorContainsTarget(target: EventTarget | null): boolean {
	if (!target || !app.value?.canvas) return false;
	const node = target as Node;
	return (
		app.value.canvas === node ||
		!!appContainer.value?.contains(node)
	);
}

function onKeyDown(e: KeyboardEvent) {
	if (!e.ctrlKey) return;
	if (!editorContainsTarget(e.target)) return;
	const k = e.key.toLowerCase();
	if (k === "c") {
		e.preventDefault();
		clipStore.copyFocusedOrMenuTarget();
		return;
	}
	if (k === "x") {
		e.preventDefault();
		clipStore.cutFocusedOrMenuTarget();
		return;
	}
	if (k === "v") {
		e.preventDefault();
		if (!clipStore.canPaste) return;
		clipStore.pasteFromKeyboard();
		return;
	}
	if (k === "z") {
		e.preventDefault();
		clipStore.undo();
	}
}

function onGlobalMouseDown(e: MouseEvent) {
	const el = e.target as HTMLElement | null;
	if (el?.closest?.(".schema-editor-ctx-menu")) return;
	clipStore.closeMenu();
}

let canvasContextMenuPrevent: ((ev: Event) => void) | null = null;

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
			clipStore.registerBridge(createClipboardBridge());
			canvasContextMenuPrevent = (ev: Event) => {
				if (ev.target === app.value?.canvas) ev.preventDefault();
			};
			app.value.canvas.addEventListener(
				"contextmenu",
				canvasContextMenuPrevent,
			);
			if (graphicSchemeStore.postRenderCbs) {
				for (const postRenderCb of graphicSchemeStore.postRenderCbs) {
					await postRenderCb();
				}
			}
		}
	}, 200);

	window.addEventListener("keydown", onKeyDown, true);
	window.addEventListener("mousedown", onGlobalMouseDown, true);
});

onUnmounted(() => {
	window.removeEventListener("keydown", onKeyDown, true);
	window.removeEventListener("mousedown", onGlobalMouseDown, true);
	if (app.value?.canvas && canvasContextMenuPrevent) {
		app.value.canvas.removeEventListener(
			"contextmenu",
			canvasContextMenuPrevent,
		);
	}
	clipStore.unregisterBridge();
});
</script>
<template>
	<div
		ref="appContainer"
		tabindex="0"
		:style="{ width: '1000px', height: '1000px' }"
		class="pixi-container"
	>
		<SchemaEditorContextMenu />
	</div>
</template>
<style scoped>
.pixi-container {
	position: relative;
	overflow: hidden;
	outline: none;
}

canvas {
	display: block;
	outline: none;
}
</style>
