<script setup lang="ts">
import type { Viewport } from "pixi-viewport";
import {
	BaseTool,
	useGraphicSchemeStore,
	useRenderSchema,
} from "..";
import type { EditorClipboardBridge } from "../model/stores/editor-clipboard.store";
import { useEditorClipboardStore } from "../model/stores/editor-clipboard.store";
import {
	isObjectFixedOnScheme,
	readBackendProperties,
	setFixedOnSchemeInProperties,
} from "../lib/object-fixed-on-scheme";
import {
	isValveOpenFromProperties,
	setValveOpenInProperties,
} from "../lib/valve-state";
import {
	canAttachMonitorToFeature,
	createDefaultMonitorBackendProperties,
	findMonitorForSource,
	buildMonitorTitle,
	getMonitorPresetForFeature,
	objectAnchorPosition,
	setMonitorResultSlots,
	syncMonitorsInObjectList,
} from "../lib/monitor-object";
import { isValveFeature } from "../model/schema/feature-type-aliases";
import { Application, CullerPlugin, extensions } from "pixi.js";
import type { GraphicObjectDto, ObjectBaseData, ObjectDescription } from "../api";
import {
	onMounted,
	nextTick,
	shallowRef,
	toRef,
	ref,
	computed,
	onUnmounted,
	markRaw,
	provide,
} from "vue";
import { SCHEMA_EDITOR_OBJECTS_KEY } from "./schema-editor-inject";
import {
	getEditorUiTheme,
	initEditorUiTheme,
	resolveCanvasBackgroundHex,
	type EditorUiTheme,
} from "../lib/editor-ui-theme";
import SchemaEditorContextMenu from "./SchemaEditorContextMenu.vue";

const objects = defineModel<GraphicObjectDto<ObjectBaseData>[]>("objects", {
	required: true,
});

provide(SCHEMA_EDITOR_OBJECTS_KEY, objects);

const props = defineProps<{
	descriptions: ObjectDescription[];
	tool?: BaseTool;
	winRef: HTMLDivElement | any;
}>();

const emit = defineEmits<{
	/** Выделенные краны/трубы — открыть окно графиков (обрабатывает demo). */
	openCharts: [schemeObjectIds: number[]];
}>();

extensions.add(CullerPlugin);
const { renderSchema } = useRenderSchema(objects, toRef(() => props.descriptions));
const graphicSchemeStore = useGraphicSchemeStore();
const clipStore = useEditorClipboardStore();

const appContainer = ref<HTMLDivElement | null>(null);
const app = shallowRef<Application | null>(null);
const winRef = toRef(() => props.winRef as HTMLDivElement);

const viewport = shallowRef<Viewport>();
const uiTheme = ref<EditorUiTheme>("dark");

function canvasScreenRect(): DOMRect | null {
	return graphicSchemeStore.app?.canvas?.getBoundingClientRect() ?? null;
}

function createClipboardBridge(): EditorClipboardBridge {
	const gs = useGraphicSchemeStore();
	return {
		getObjects: () => objects.value,
		setObjects: (next) => {
			objects.value = next;
		},
		clientToWorld(clientX: number, clientY: number) {
			const vp = gs.app?.stage.getChildByLabel("viewport") as
				| Viewport
				| undefined;
			const r = canvasScreenRect();
			if (!vp || !r) return null;
			return vp.toWorld(clientX - r.left, clientY - r.top);
		},
		getViewportCenterWorld() {
			const vp = gs.app?.stage.getChildByLabel("viewport") as
				| Viewport
				| undefined;
			const r = canvasScreenRect();
			if (!vp || !r) return null;
			return vp.toWorld(r.width / 2, r.height / 2);
		},
		isObjectFixed(id: number) {
			const o = objects.value.find((x) => x.id === id);
			if (!o) return false;
			return isObjectFixedOnScheme(readBackendProperties(o.data));
		},
		setObjectFixed(id: number, fixed: boolean) {
			const idx = objects.value.findIndex((x) => x.id === id);
			if (idx < 0) return;
			const cur = objects.value[idx]!;
			if (!cur.data || typeof cur.data !== "object") {
				cur.data = { techObjectId: id };
			}
			const data = cur.data as { backendProperties?: Record<string, unknown> };
			if (!data.backendProperties) data.backendProperties = {};
			setFixedOnSchemeInProperties(data.backendProperties, fixed);
			const next = objects.value.slice();
			next[idx] = {
				...cur,
				data: { ...data },
			};
			objects.value = next;
		},
		setObjectsFixed(ids: number[], fixed: boolean) {
			if (ids.length === 0) return;
			const idSet = new Set(ids);
			const next = objects.value.slice();
			let changed = false;
			for (let idx = 0; idx < next.length; idx++) {
				const cur = next[idx]!;
				if (!idSet.has(cur.id)) continue;
				if (!cur.data || typeof cur.data !== "object") {
					cur.data = { techObjectId: cur.id };
				}
				const data = cur.data as {
					backendProperties?: Record<string, unknown>;
				};
				if (!data.backendProperties) data.backendProperties = {};
				setFixedOnSchemeInProperties(data.backendProperties, fixed);
				next[idx] = { ...cur, data: { ...data } };
				changed = true;
			}
			if (changed) objects.value = next;
		},
		isValveOpen(id: number) {
			const o = objects.value.find((x) => x.id === id);
			if (!o || !isValveFeature(o.featureObjectType)) return false;
			return isValveOpenFromProperties(readBackendProperties(o.data));
		},
		setValveOpen(ids: number[], open: boolean) {
			if (ids.length === 0) return;
			const idSet = new Set(ids);
			const next = objects.value.slice();
			let changed = false;
			for (let idx = 0; idx < next.length; idx++) {
				const cur = next[idx]!;
				if (!idSet.has(cur.id) || !isValveFeature(cur.featureObjectType)) {
					continue;
				}
				if (!cur.data || typeof cur.data !== "object") {
					cur.data = { techObjectId: cur.id };
				}
				const data = cur.data as {
					backendProperties?: Record<string, unknown>;
				};
				if (!data.backendProperties) data.backendProperties = {};
				setValveOpenInProperties(data.backendProperties, open);
				next[idx] = { ...cur, data: { ...data } };
				changed = true;
			}
			if (changed) objects.value = next;
		},
		canShowMonitorFor(id: number) {
			const o = objects.value.find((x) => x.id === id);
			return !!o && canAttachMonitorToFeature(o.featureObjectType);
		},
		toggleMonitorForSource(sourceId: number) {
			const existing = findMonitorForSource(objects.value, sourceId);
			if (existing) {
				objects.value = objects.value.filter((o) => o.id !== existing.id);
				return;
			}
			const source = objects.value.find((o) => o.id === sourceId);
			if (!source || !canAttachMonitorToFeature(source.featureObjectType)) {
				return;
			}
			const newId =
				(objects.value.length
					? Math.max(...objects.value.map((o) => o.id))
					: 0) + 1;
			const anchor = objectAnchorPosition(source);
			const data: ObjectBaseData = {
				techObjectId: newId,
				monitorSourceId: sourceId,
				backendProperties: createDefaultMonitorBackendProperties(
					buildMonitorTitle(source),
				),
			};
			setMonitorResultSlots(
				data,
				getMonitorPresetForFeature(source.featureObjectType),
			);
			const next: GraphicObjectDto<ObjectBaseData>[] = [
				...objects.value,
				{
					id: newId,
					featureObjectType: "Monitor",
					graphObjectType: "pointer",
					position: { x: anchor.x, y: anchor.y - 58 },
					data,
				},
			];
			syncMonitorsInObjectList(next);
			objects.value = next;
		},
		openChartsForSchemeObjectIds(schemeIds: number[]) {
			emit("openCharts", schemeIds);
		},
	};
}

function editorContainsTarget(target: EventTarget | null): boolean {
	if (!app.value?.canvas || !appContainer.value) return false;
	const node = target as Node | null;
	if (node && (app.value.canvas === node || appContainer.value.contains(node))) {
		return true;
	}
	const ae = document.activeElement;
	return !!(ae && appContainer.value.contains(ae));
}

function isTypingInFocusedField(): boolean {
	const ae = document.activeElement;
	if (!ae || !(ae instanceof HTMLElement)) return false;
	const tag = ae.tagName;
	if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
	return ae.isContentEditable;
}

/** Ctrl+… / ⌘+… не зависят от раскладки (используем e.code, не e.key). */
function editorAllowsClipboardShortcuts(_e: KeyboardEvent): boolean {
	if (isTypingInFocusedField()) return false;
	if (!clipStore.bridge) return false;
	if (graphicSchemeStore.selectedObjectIds.length > 0) return true;
	if (editorContainsTarget(_e.target)) return true;
	if (clipStore.focusedObjectId != null) return true;
	return false;
}

function editorAllowsSelectAll(e: KeyboardEvent): boolean {
	if (isTypingInFocusedField()) return false;
	if (editorContainsTarget(e.target)) return true;
	const ae = document.activeElement;
	if (ae && appContainer.value?.contains(ae)) return true;
	return editorAllowsClipboardShortcuts(e);
}

function onEditorSurfacePointerDown() {
	appContainer.value?.focus({ preventScroll: true });
}

function onKeyDown(e: KeyboardEvent) {
	if (e.code === "Delete" || e.code === "Backspace") {
		if (!editorAllowsClipboardShortcuts(e)) return;
		e.preventDefault();
		clipStore.deleteFocusedOrMenuTarget();
		return;
	}

	const mod = e.ctrlKey || e.metaKey;
	if (mod && e.code === "KeyA") {
		if (!editorAllowsSelectAll(e)) return;
		e.preventDefault();
		clipStore.selectAll();
		return;
	}
	if (!mod) return;
	if (!editorAllowsClipboardShortcuts(e)) return;

	switch (e.code) {
		case "KeyC": {
			e.preventDefault();
			e.stopImmediatePropagation();
			clipStore.copyFocusedOrMenuTarget();
			return;
		}
		case "KeyX": {
			e.preventDefault();
			e.stopImmediatePropagation();
			clipStore.cutFocusedOrMenuTarget();
			return;
		}
		case "KeyV": {
			e.preventDefault();
			e.stopImmediatePropagation();
			if (!clipStore.canPaste) return;
			clipStore.pasteFromKeyboard();
			return;
		}
		case "KeyZ": {
			e.preventDefault();
			e.stopImmediatePropagation();
			clipStore.undo();
			return;
		}
		default:
			return;
	}
}

function onGlobalMouseDown(e: MouseEvent) {
	if (e.button !== 0) return;
	const el = e.target as HTMLElement | null;
	if (el?.closest?.(".schema-editor-ctx-menu")) return;
	clipStore.closeMenu();
}

/** Только блокируем браузерное ПКМ; меню не закрываем — иначе сразу после Pixi `onrightclick` оно гаснет. */
function onGlobalContextMenu(e: MouseEvent) {
	const el = e.target as HTMLElement | null;
	if (el?.closest?.(".schema-editor-ctx-menu")) {
		e.preventDefault();
		return;
	}
	if (el?.closest?.(".pixi-container, .editor-surface, canvas")) {
		e.preventDefault();
	}
}

let canvasContextMenuPrevent: ((ev: Event) => void) | null = null;
let editorSurfaceContextMenuPrevent: ((ev: Event) => void) | null = null;
let canvasPointerMove: ((ev: PointerEvent) => void) | null = null;

onMounted(async () => {
	initEditorUiTheme();
	uiTheme.value = getEditorUiTheme();
	graphicSchemeStore.applyUiTheme(uiTheme.value);

	await nextTick();
	if (props.tool) {
		graphicSchemeStore.tool = props.tool;
	} else {
		graphicSchemeStore.tool = new BaseTool();
	}
	app.value = new Application();
	await app.value.init({
		resizeTo: appContainer.value ?? props.winRef,
		backgroundColor: resolveCanvasBackgroundHex(
			graphicSchemeStore.backroundColor,
			graphicSchemeStore.uiTheme,
		),
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
			graphicSchemeStore.app = markRaw(app.value);
			clipStore.registerBridge(createClipboardBridge());
			viewport.value = renderSchema(app.value);
			graphicSchemeStore.refreshCanvasBackground();
			canvasContextMenuPrevent = (ev: Event) => ev.preventDefault();
			app.value.canvas.addEventListener(
				"contextmenu",
				canvasContextMenuPrevent,
			);
			editorSurfaceContextMenuPrevent = (ev: Event) => ev.preventDefault();
			appContainer.value?.addEventListener(
				"contextmenu",
				editorSurfaceContextMenuPrevent,
			);
			canvasPointerMove = (ev: PointerEvent) => {
				const world = clipStore.bridge?.clientToWorld(
					ev.clientX,
					ev.clientY,
				);
				if (world) clipStore.setLastCursorWorld(world);
			};
			app.value.canvas.addEventListener("pointermove", canvasPointerMove);
			if (graphicSchemeStore.postRenderCbs) {
				for (const postRenderCb of graphicSchemeStore.postRenderCbs) {
					await postRenderCb();
				}
			}
		}
	}, 200);

	window.addEventListener("keydown", onKeyDown, true);
	window.addEventListener("mousedown", onGlobalMouseDown, true);
	window.addEventListener("contextmenu", onGlobalContextMenu, true);
});

onUnmounted(() => {
	window.removeEventListener("keydown", onKeyDown, true);
	window.removeEventListener("mousedown", onGlobalMouseDown, true);
	window.removeEventListener("contextmenu", onGlobalContextMenu, true);
	if (appContainer.value && editorSurfaceContextMenuPrevent) {
		appContainer.value.removeEventListener(
			"contextmenu",
			editorSurfaceContextMenuPrevent,
		);
	}
	if (app.value?.canvas) {
		if (canvasContextMenuPrevent) {
			app.value.canvas.removeEventListener(
				"contextmenu",
				canvasContextMenuPrevent,
			);
		}
		if (canvasPointerMove) {
			app.value.canvas.removeEventListener("pointermove", canvasPointerMove);
		}
	}
	clipStore.unregisterBridge();
});
</script>
<template>
	<div
		ref="appContainer"
		tabindex="0"
		:style="{ width: '100%', height: '100%' }"
		class="pixi-container"
		@contextmenu.prevent
		@pointerdown.capture="onEditorSurfacePointerDown"
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
