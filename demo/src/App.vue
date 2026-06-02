<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { GraphicalEditor } from "../../packages/core/src/ui";
import type { GraphicObjectDto, ObjectBaseData } from "../../packages/core/src/api/types";
import {
	useEditorClipboardStore,
	useGraphicSchemeStore,
} from "../../packages/core/src/model/stores";
import ObjectPropertiesPanel from "./components/ObjectPropertiesPanel.vue";
import MonitorDisplaySlotsPanel from "./components/MonitorDisplaySlotsPanel.vue";
import MessageLogPanel from "./components/MessageLogPanel.vue";
import { logError, logInfo, logSuccess } from "./lib/message-log";
import SchemeApiLoadDialog, {
	type SchemeLoadedMeta,
} from "./components/SchemeApiLoadDialog.vue";
import { useEditorSelectionBridgeStore } from "@graphical-editor/editor-bridge";
import EditorSidebar from "./components/EditorSidebar.vue";
import ToolbarIconButton from "./components/ToolbarIconButton.vue";
import { toggleEditorUiTheme } from "../../packages/core/src/lib/editor-ui-theme";
import MetamodelToolbox from "./components/MetamodelToolbox.vue";
import { baseDescriptors } from "./data/descriptors";
import {
	isMonitorFeature,
	isPipeFeature,
} from "../../packages/core/src/model/schema/feature-type-aliases";
import {
	getMetamodelObjectTypeByCode,
	getMetamodelObjectTypeById,
	MM_DRAG_MIME,
	parseMetamodelDragPayload,
} from "./data/metamodel-db.stub";
import {
	BACKEND_SCHEME_DOWNLOAD_FILENAME,
	buildBackendSchemePayload,
} from "./lib/backend-scheme-export";
import {
	defaultSchemeName,
	formatErrorForAlert,
	postSchemeToDomainService,
} from "./lib/domain-scheme-api";
import { applyCalculationResultsToObjects } from "./lib/apply-calculation-results";
import {
	fingerprintSchemeJson,
	runStaticCalculationFlow,
	type SavedSchemeState,
} from "./lib/static-calculation-api";
import { syncPipePointsToTopology } from "./lib/pipe-geometry-sync";
import { clientToWorld } from "./lib/client-to-world";
import { createInstanceFromMetamodelDrop } from "./lib/metamodel-drop";
import { loadMetamodelAtStartup } from "./lib/metamodel-startup";
import {
	deserializeScheme,
	triggerDownload,
	trySaveSchemeWithFilePicker,
} from "./lib/scheme-persistence";
import { DemoTool } from "./tools/demo-tool";
import { usePipeDrawStore } from "./stores/pipe-draw.store";
import {
	ensurePropertyTemplatesLoaded,
	getDefaultPropertiesForFeature,
	getDefaultSchemaProperties,
	mergeMissingPropertyDefaults,
	normalizeBackendPropertiesLayout,
} from "./lib/backend-property-templates";
import {
	setPropertyValue,
	type PropertyPath,
} from "./lib/backend-properties";
import type { BackendSchemeEnvelope } from "./lib/backend-scheme-import";
import { pruneDisconnectedEditorObjects } from "./lib/backend-scheme-topology";
import type { EditorPayload } from "./lib/editor-adapter";
import {
	setActiveMonitorSlotKeys,
	syncMonitorsInObjectList,
} from "../../packages/core/src/lib/monitor-object";
import {
	applyRegistrationLabelToProperties,
	readRegistrationId,
	repairRegistrationIds,
} from "../../packages/core/src/lib/registration-id";
import {
	buildChartOpenItems,
	ensureChartObjectIds,
	isChartableSchemeObject,
	resolveChartObjectId,
} from "../../packages/core/src/lib/chart-object-map";
import { PENDING_CHARTS_OPEN_STORAGE_KEY } from "@graphical-editor/editor-bridge";

const panelRef = ref<HTMLElement | null>(null);
const importInput = ref<HTMLInputElement | null>(null);
const clipStore = useEditorClipboardStore();
const graphicSchemeStore = useGraphicSchemeStore();
const { gridVisible, uiTheme: editorUiTheme } = storeToRefs(graphicSchemeStore);

const TOOLBAR_ICON_CREATE = "/icons/toolbar-create-scheme.png";
const TOOLBAR_ICON_LOAD = "/icons/toolbar-load-scheme.png";
const TOOLBAR_ICON_LOAD_API = "/icons/toolbar-load-api.svg";
const TOOLBAR_ICON_SAVE = "/icons/toolbar-save-scheme.svg";
const TOOLBAR_ICON_TRANSFER = "/icons/toolbar-transfer-json.svg";
const TOOLBAR_ICON_CHARTS = "/icons/toolbar-charts.svg";
const TOOLBAR_ICON_CALC = "/icons/toolbar-calc.svg";
const TOOLBAR_ICON_GRID_ON = "/icons/toolbar-grid-on.svg";
const TOOLBAR_ICON_GRID_OFF = "/icons/toolbar-grid-off.svg";
const TOOLBAR_ICON_THEME_DARK = "/icons/toolbar-theme-dark.svg";
const TOOLBAR_ICON_THEME_LIGHT = "/icons/toolbar-theme-light.svg";

const gridToggleLabel = computed(() =>
	gridVisible.value ? "Убрать сетку" : "Добавить сетку",
);
const themeToggleLabel = computed(() =>
	editorUiTheme.value === "dark" ? "Светлая тема" : "Тёмная тема",
);
const transferSchemeLabel = computed(() =>
	transferringScheme.value ? "Передача…" : "Передать JSON",
);
const calculationLabel = computed(() =>
	runningCalculation.value ? "Расчёт…" : "Провести расчёты",
);
const gridIconSrc = computed(() =>
	gridVisible.value ? TOOLBAR_ICON_GRID_ON : TOOLBAR_ICON_GRID_OFF,
);
const themeIconSrc = computed(() =>
	editorUiTheme.value === "dark"
		? TOOLBAR_ICON_THEME_DARK
		: TOOLBAR_ICON_THEME_LIGHT,
);

function onToggleGrid() {
	graphicSchemeStore.toggleGridVisible();
}

function onToggleUiTheme() {
	const next = toggleEditorUiTheme();
	graphicSchemeStore.applyUiTheme(next);
	syncMonitorsInObjectList(objects.value);
	objects.value = [...objects.value];
}
const pipeDrawStore = usePipeDrawStore();
const selectionBridge = useEditorSelectionBridgeStore();
const tool = new DemoTool();
const objects = ref<ReturnType<typeof deserializeScheme>["objects"]>([]);
const descriptions = ref(baseDescriptors);
/** Подсветка панели при перетаскивании с палитры (как в dispatcher SchemaViewer). */
const panelDragHint = ref(false);
const transferringScheme = ref(false);
const runningCalculation = ref(false);
const schemeApiDialogOpen = ref(false);
const savedSchemeState = ref<SavedSchemeState | null>(null);
const schemaProperties = ref<Record<string, unknown>>({});
const extraBackendObjects = ref<Record<string, unknown>[]>([]);
const backendEnvelope = ref<BackendSchemeEnvelope | undefined>(undefined);
const templatesReady = ref(false);

const FEATURE_LABELS: Record<string, string> = {
	Producer: "Поставщик",
	consumer: "Потребитель",
	pipe: "Труба",
	Valve: "Кран",
	Monitor: "Монитор",
};

const selectedObjectId = computed(() => {
	const ids = graphicSchemeStore.selectedObjectIds;
	if (ids.length > 0) return ids[ids.length - 1]!;
	const focused = clipStore.focusedObjectId;
	return focused != null ? focused : null;
});

const selectedObject = computed(() =>
	selectedObjectId.value != null
		? objects.value.find((o) => o.id === selectedObjectId.value) ?? null
		: null,
);

const propertiesPanelTitle = computed(() => {
	if (selectedObject.value) {
		const label =
			FEATURE_LABELS[selectedObject.value.featureObjectType] ??
			selectedObject.value.featureObjectType;
		return `${label} (id ${selectedObject.value.id})`;
	}
	return "Схема";
});

const propertiesPanelSubtitle = computed(() =>
	selectedObject.value ? undefined : "Параметры документа Schema",
);

const propertiesPanelModel = computed<Record<string, unknown>>(() => {
	if (selectedObject.value) {
		return (
			(selectedObject.value.data?.backendProperties as
				| Record<string, unknown>
				| undefined) ?? {}
		);
	}
	return schemaProperties.value;
});

const selectedMonitorContext = computed(() => {
	const obj = selectedObject.value;
	if (!obj || !isMonitorFeature(obj.featureObjectType) || !obj.data) {
		return null;
	}
	const sourceId = obj.data.monitorSourceId;
	const source =
		sourceId != null
			? (objects.value.find((o) => o.id === sourceId) ?? null)
			: null;
	return { monitor: obj, source };
});

watch(
	selectedMonitorContext,
	(ctx) => {
		if (!ctx?.source) return;
		ensureObjectBackendProperties(ctx.source);
		ensureObjectBackendProperties(ctx.monitor);
	},
	{ immediate: true },
);

function onMonitorSlotsChange(selectedKeys: string[]) {
	const obj = selectedObject.value;
	if (!obj?.data) return;
	setActiveMonitorSlotKeys(obj.data, selectedKeys);
	clipStore.pushUndo();
	refreshMonitorDisplays();
}

function ensureObjectBackendProperties(
	obj: GraphicObjectDto<ObjectBaseData>,
): Record<string, unknown> {
	if (!obj.data) obj.data = { techObjectId: obj.id };
	const defaults = getDefaultPropertiesForFeature(obj.featureObjectType);
	if (
		!obj.data.backendProperties ||
		!Object.keys(obj.data.backendProperties).length
	) {
		obj.data.backendProperties = defaults;
	} else if (Object.keys(defaults).length) {
		mergeMissingPropertyDefaults(obj.data.backendProperties, defaults);
	}
	normalizeBackendPropertiesLayout(obj.data.backendProperties);
	if (!readRegistrationId(obj.data.backendProperties)) {
		applyRegistrationLabelToProperties(
			obj.data.backendProperties,
			obj.featureObjectType,
			obj.id,
		);
	}
	return obj.data.backendProperties;
}

function refreshMonitorDisplays() {
	ensureChartObjectIds(objects.value);
	if (repairRegistrationIds(objects.value)) {
		objects.value = [...objects.value];
	}
	syncMonitorsInObjectList(objects.value);
	objects.value = [...objects.value];
}

function onPropertyPanelChange(path: PropertyPath, value: string) {
	if (selectedObject.value) {
		const props = ensureObjectBackendProperties(selectedObject.value);
		setPropertyValue(props, path, value);
		clipStore.pushUndo();
		refreshMonitorDisplays();
		// Поверхностный watch: переприсваивание массива после мутации data на месте.
		objects.value = [...objects.value];
		return;
	}
	setPropertyValue(schemaProperties.value, path, value);
	schemaProperties.value = { ...schemaProperties.value };
}

watch(
	() => clipStore.focusedObjectId,
	(id) => {
		if (id == null) {
			selectionBridge.setSelectedSchemeObjectId(null);
			return;
		}
		const dto = objects.value.find((o) => o.id === id);
		const chartId =
			dto && isChartableSchemeObject(dto)
				? resolveChartObjectId(dto, objects.value)
				: null;
		selectionBridge.setSelectedSchemeObjectId(id, chartId);
	},
	{ immediate: true },
);

watch(selectedObject, (obj) => {
	if (obj) {
		ensureObjectBackendProperties(obj);
		if (isMonitorFeature(obj.featureObjectType)) {
			refreshMonitorDisplays();
		}
	}
});

/** Пересчёт концов привязанных труб при перемещении поставщика/потребителя (не при редактировании самой трубы). */
watch(
	() =>
		objects.value
			.filter((o) => o.graphObjectType === "pointer")
			.map(
				(o) =>
					`${o.id}:${Math.round(o.position?.x ?? 0)}:${Math.round(o.position?.y ?? 0)}`,
			)
			.join("|"),
	() => {
		const synced = syncPipePointsToTopology(objects.value);
		if (synced !== objects.value) {
			objects.value = synced;
		}
	},
);

let detachPipeCanvasListener: (() => void) | null = null;

function attachPipeCanvasListener() {
	detachPipeCanvasListener?.();
	detachPipeCanvasListener = null;
	const canvas = graphicSchemeStore.app?.canvas;
	if (!canvas) return;
	const onPointerDownCapture = (e: PointerEvent) => {
		if (e.target !== canvas) return;
		if (pipeDrawStore.phase === "idle") return;
		const world = clipStore.bridge?.clientToWorld(e.clientX, e.clientY);
		if (!world) return;
		const consumed = pipeDrawStore.handleCanvasWorldClick(
			world,
			objects.value,
			(next) => {
				clipStore.pushUndo();
				objects.value = next;
			},
			pipeDrawStore.pipeObjectTypeId ??
				getMetamodelObjectTypeByCode("pipe")?.id,
		);
		if (consumed) {
			e.preventDefault();
			e.stopImmediatePropagation();
		}
	};
	canvas.addEventListener("pointerdown", onPointerDownCapture, true);
	detachPipeCanvasListener = () => {
		canvas.removeEventListener("pointerdown", onPointerDownCapture, true);
	};
}

watch(
	() => graphicSchemeStore.app?.canvas,
	() => {
		attachPipeCanvasListener();
	},
	{ immediate: true },
);

function persistBackendSchemeForExit() {
	try {
		const json = JSON.stringify(buildEditorSchemeJson(), null, 4);
		localStorage.setItem("graphical-editor-backend-scheme-exit", json);
	} catch {
		/* не блокируем закрытие вкладки */
	}
}

function onGlobalKeydown(e: KeyboardEvent) {
	if (e.code === "Escape") {
		pipeDrawStore.cancel();
	}
}

onMounted(async () => {
	await loadMetamodelAtStartup();
	try {
		await ensurePropertyTemplatesLoaded();
		templatesReady.value = true;
		if (!Object.keys(schemaProperties.value).length) {
			schemaProperties.value = getDefaultSchemaProperties();
		}
		for (const o of objects.value) {
			ensureObjectBackendProperties(o);
		}
		refreshMonitorDisplays();
	} catch (e) {
		console.warn("Шаблоны свойств не загружены", e);
	}
	window.addEventListener("pagehide", persistBackendSchemeForExit);
	window.addEventListener("beforeunload", persistBackendSchemeForExit);
	window.addEventListener("keydown", onGlobalKeydown, true);
});

onUnmounted(() => {
	detachPipeCanvasListener?.();
	window.removeEventListener("pagehide", persistBackendSchemeForExit);
	window.removeEventListener("beforeunload", persistBackendSchemeForExit);
	window.removeEventListener("keydown", onGlobalKeydown, true);
});

function buildEditorSchemeJson(options?: {
	/** true — POST/расчёт на API без class Monitor */
	omitMonitors?: boolean;
}): Record<string, unknown> {
	const { objects: pruned, removedIds } = pruneDisconnectedEditorObjects(
		objects.value,
	);
	if (removedIds.length) {
		objects.value = pruned;
		console.warn(
			"[схема] Удалены объекты без связи с трубами:",
			removedIds.join(", "),
		);
	}
	return buildBackendSchemePayload(
		pruned,
		schemaProperties.value,
		undefined,
		backendEnvelope.value,
		{ omitMonitors: options?.omitMonitors === true },
	);
}

function createScheme() {
	pipeDrawStore.cancel();
	savedSchemeState.value = null;
	objects.value = [];
	descriptions.value = baseDescriptors;
	schemaProperties.value = templatesReady.value
		? getDefaultSchemaProperties()
		: {};
	extraBackendObjects.value = [];
	backendEnvelope.value = undefined;
	graphicSchemeStore.clearSelectedObjects();
	selectionBridge.setSelectedSchemeObjectId(null);
}

function openLoadSchemePicker() {
	importInput.value?.click();
}

const CHARTS_WINDOW_NAME = "charts-for-diplom";

function chartsPageUrl(): string {
	const base = import.meta.env.BASE_URL.replace(/\/$/, "") || "";
	return `${window.location.origin}${base}/charts.html`;
}

function openChartsInNewWindow() {
	window.open(chartsPageUrl(), CHARTS_WINDOW_NAME, "noopener,noreferrer");
}

function onOpenChartsFromEditor(schemeObjectIds: number[]) {
	ensureChartObjectIds(objects.value);
	const items = buildChartOpenItems(objects.value, schemeObjectIds);
	if (!items.length) return;

	sessionStorage.setItem(
		PENDING_CHARTS_OPEN_STORAGE_KEY,
		JSON.stringify(items),
	);
	window.open(chartsPageUrl(), CHARTS_WINDOW_NAME, "noopener,noreferrer");

	selectionBridge.requestOpenCharts(items);
	for (const delay of [250, 700, 1500]) {
		window.setTimeout(() => selectionBridge.requestOpenCharts(items), delay);
	}
}

function isMetamodelDrag(dt: DataTransfer | null): boolean {
	if (!dt) return false;
	return (
		dt.types.includes(MM_DRAG_MIME) ||
		dt.types.includes("application/json")
	);
}

function onEditorDragOver(e: DragEvent) {
	const dt = e.dataTransfer;
	if (!isMetamodelDrag(dt)) {
		panelDragHint.value = false;
		return;
	}
	e.preventDefault();
	dt!.dropEffect = "copy";
	panelDragHint.value = true;
}

function onPanelDragLeave(e: DragEvent) {
	const panel = panelRef.value;
	const rel = e.relatedTarget as Node | null;
	if (panel && rel && panel.contains(rel)) return;
	panelDragHint.value = false;
}

function onEditorDrop(e: DragEvent) {
	panelDragHint.value = false;
	const dt = e.dataTransfer;
	if (!dt) return;
	const raw =
		dt.getData(MM_DRAG_MIME) || dt.getData("application/json");
	const payloadDrop = parseMetamodelDragPayload(raw);
	if (!payloadDrop) return;
	const world = clientToWorld(e.clientX, e.clientY);
	if (!world) return;
	e.preventDefault();
	if (
		payloadDrop.graphObjectType === "linear" ||
		isPipeFeature(payloadDrop.code)
	) {
		const mmType =
			getMetamodelObjectTypeById(payloadDrop.objectTypeId) ??
			getMetamodelObjectTypeByCode("pipe");
		pipeDrawStore.beginFromPalette(mmType?.id);
		return;
	}
	try {
		const next = createInstanceFromMetamodelDrop(
			payloadDrop,
			world,
			objects.value,
			descriptions.value,
		);
		clipStore.pushUndo();
		ensureObjectBackendProperties(next);
		objects.value = [...objects.value, next];
		refreshMonitorDisplays();
	} catch {
		/* нет дескриптора для типа */
	}
}

/** POST схемы в сервис предметной области (тот же JSON, что при сохранении в файл). */
async function transferSchemeJson() {
	if (transferringScheme.value) return;
	const suggested = defaultSchemeName();
	const name = window.prompt("Имя схемы для бэкенда:", suggested)?.trim();
	if (!name) return;

	transferringScheme.value = true;
	try {
		const payload = buildEditorSchemeJson({ omitMonitors: true });
		const result = await postSchemeToDomainService(payload, name);
		const id = result.id;
		if (id != null) {
			savedSchemeState.value = {
				schemeId: id,
				fingerprint: fingerprintSchemeJson(payload),
				name,
			};
		}
		const idPart = id != null ? ` Идентификатор: ${id}.` : "";
		logSuccess(
			`Схема «${name}» передана на сервер (HTTP ${result.status}).${idPart}`,
		);
	} catch (e) {
		console.error(e);
		logError("Не удалось передать схему на сервер", formatErrorForAlert(e));
	} finally {
		transferringScheme.value = false;
	}
}

/** Сохранение в формате бэкенда (objects, lines, references, floats, …). */
async function saveSchemeToFile() {
	try {
		const json = JSON.stringify(buildEditorSchemeJson(), null, 4);
		const result = await trySaveSchemeWithFilePicker(
			json,
			BACKEND_SCHEME_DOWNLOAD_FILENAME,
		);
		if (result === "need_download") {
			triggerDownload(BACKEND_SCHEME_DOWNLOAD_FILENAME, json);
		}
		logSuccess("Схема сохранена в файл (формат бэкенда).");
	} catch (e) {
		console.error(e);
		logError("Не удалось сохранить схему в файл", formatErrorForAlert(e));
	}
}

async function applyEditorPayload(next: EditorPayload) {
	await ensurePropertyTemplatesLoaded();
	objects.value = next.objects;
	descriptions.value = next.descriptions;
	if (next.schemaProperties) {
		schemaProperties.value = next.schemaProperties;
	}
	extraBackendObjects.value = next.extraBackendObjects ?? [];
	backendEnvelope.value = next.backendEnvelope;
	for (const o of objects.value) {
		ensureObjectBackendProperties(o);
	}
	refreshMonitorDisplays();
	graphicSchemeStore.clearSelectedObjects();
	pipeDrawStore.cancel();
}

function openLoadSchemeFromApi() {
	schemeApiDialogOpen.value = true;
}

function onSchemeLoadedFromApi(next: EditorPayload, meta: SchemeLoadedMeta) {
	void applyEditorPayload(next)
		.then(() => {
			const json = buildEditorSchemeJson();
			savedSchemeState.value = {
				schemeId: meta.schemeId,
				fingerprint: fingerprintSchemeJson(json),
				name: meta.name,
			};
		})
		.then(() => {
			logSuccess(`Схема «${meta.name}» загружена с сервера.`);
		})
		.catch((err) => {
			logError("Не удалось загрузить схему с сервера", formatErrorForAlert(err));
		});
}

async function runStaticCalculation() {
	if (runningCalculation.value) return;
	if (!objects.value.length) {
		logInfo("Добавьте объекты на схему перед расчётом.");
		return;
	}

	const schemeName =
		savedSchemeState.value?.name?.trim() || defaultSchemeName();
	const schemeJson = buildEditorSchemeJson({ omitMonitors: true });

	runningCalculation.value = true;
	try {
		const { calculationResult, savedState, schemeId } =
			await runStaticCalculationFlow({
				schemeJson,
				schemeName,
				saved: savedSchemeState.value,
			});

		savedSchemeState.value = savedState;

		const { objects: nextObjects, updatedCount } =
			applyCalculationResultsToObjects(objects.value, calculationResult);

		if (updatedCount > 0) {
			clipStore.pushUndo();
			objects.value = nextObjects;
			refreshMonitorDisplays();
		}

		console.log("[расчёт]", calculationResult);

		if (updatedCount > 0) {
			logSuccess(
				`Расчёт выполнен (схема ${schemeId}). Обновлено объектов: ${updatedCount}.`,
			);
		} else {
			logInfo(
				`Расчёт выполнен (схема ${schemeId}). Проверьте формат ответа API — свойства на схеме не распознаны.`,
			);
		}
	} catch (e) {
		console.error(e);
		logError("Ошибка при выполнении расчёта", formatErrorForAlert(e));
	} finally {
		runningCalculation.value = false;
	}
}

function onSchemeImportChange(e: Event) {
	const input = e.target as HTMLInputElement;
	const file = input.files?.[0];
	input.value = "";
	if (!file) return;
	const reader = new FileReader();
	reader.onload = async () => {
		try {
			const text = String(reader.result ?? "");
			const next = deserializeScheme(text, descriptions.value);
			await applyEditorPayload(next);
			logSuccess("Схема загружена из файла.");
		} catch (err) {
			logError("Не удалось загрузить схему из файла", formatErrorForAlert(err));
		}
	};
	reader.readAsText(file, "utf-8");
}
</script>

<template>
	<div class="layout">
		<EditorSidebar>
			<template #toolbox>
				<MetamodelToolbox />
			</template>
			<template #properties>
				<div class="props-sidebar-stack">
					<MonitorDisplaySlotsPanel
						v-if="selectedMonitorContext"
						:monitor="selectedMonitorContext.monitor"
						:source="selectedMonitorContext.source"
						@change="onMonitorSlotsChange"
					/>
					<ObjectPropertiesPanel
						:title="propertiesPanelTitle"
						:subtitle="propertiesPanelSubtitle"
						:properties="propertiesPanelModel"
						@change="onPropertyPanelChange"
					/>
				</div>
			</template>
		</EditorSidebar>

		<main class="main">
			<header class="toolbar">
				<input
					ref="importInput"
					type="file"
					class="visually-hidden"
					accept="application/json,.json"
					@change="onSchemeImportChange"
				/>
				<div class="toolbar__actions">
					<ToolbarIconButton
						label="Создать схему"
						:icon-src="TOOLBAR_ICON_CREATE"
						@click="createScheme"
					/>
					<ToolbarIconButton
						label="Загрузить из файла"
						:icon-src="TOOLBAR_ICON_LOAD"
						@click="openLoadSchemePicker"
					/>
					<ToolbarIconButton
						label="Загрузить с API"
						:icon-src="TOOLBAR_ICON_LOAD_API"
						@click="openLoadSchemeFromApi"
					/>
					<ToolbarIconButton
						label="Сохранить для бэкенда (JSON)"
						:icon-src="TOOLBAR_ICON_SAVE"
						@click="saveSchemeToFile"
					/>
					<ToolbarIconButton
						:label="transferSchemeLabel"
						:icon-src="TOOLBAR_ICON_TRANSFER"
						:disabled="transferringScheme"
						@click="transferSchemeJson"
					/>
					<ToolbarIconButton
						label="Графики (отдельное окно)"
						:icon-src="TOOLBAR_ICON_CHARTS"
						@click="openChartsInNewWindow"
					/>
					<ToolbarIconButton
						:label="calculationLabel"
						:icon-src="TOOLBAR_ICON_CALC"
						:disabled="runningCalculation"
						@click="runStaticCalculation"
					/>
					<ToolbarIconButton
						:label="gridToggleLabel"
						:icon-src="gridIconSrc"
						@click="onToggleGrid"
					/>
					<ToolbarIconButton
						:label="themeToggleLabel"
						:icon-src="themeIconSrc"
						@click="onToggleUiTheme"
					/>
				</div>
				<p v-if="pipeDrawStore.phase !== 'idle'" class="pipe-draw-hint">
					<strong>Труба:</strong> первый клик — начало (поставщик: правый порт;
					кран: ближайший из двух — левый или правый), второй — конец
					(потребитель: левый порт; кран — так же). <kbd>Esc</kbd> — отмена.
				</p>
			</header>

			<SchemeApiLoadDialog
				v-model:open="schemeApiDialogOpen"
				:descriptions="descriptions"
				@loaded="onSchemeLoadedFromApi"
			/>

			<section
				ref="panelRef"
				class="editor-surface"
				:class="{ 'editor-surface--drag-hint': panelDragHint }"
				@contextmenu.prevent
				@dragover="onEditorDragOver"
				@dragleave="onPanelDragLeave"
				@drop="onEditorDrop"
			>
				<GraphicalEditor
					v-model:objects="objects"
					:win-ref="panelRef"
					:descriptions="descriptions"
					:tool="tool"
					@open-charts="onOpenChartsFromEditor"
				/>
				<div class="message-log-overlay">
					<MessageLogPanel />
				</div>
			</section>
		</main>
	</div>
</template>

<style scoped>
.props-sidebar-stack {
	flex: 1;
	min-height: 0;
	display: flex;
	flex-direction: column;
	overflow: hidden;
}

.layout {
	display: flex;
	flex-direction: row;
	height: 100%;
	min-height: 100vh;
	background: var(--ge-bg);
	color: var(--ge-text);
	font-family:
		system-ui,
		-apple-system,
		BlinkMacSystemFont,
		"Segoe UI",
		sans-serif;
}

.main {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	min-height: 0;
	background: var(--ge-bg);
}

.toolbar {
	flex-shrink: 0;
	padding: 10px 12px 8px;
	border-bottom: 1px solid var(--ge-border-subtle);
	background: var(--ge-bg);
}

.toolbar__actions {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}

.editor-surface {
	flex: 1;
	min-height: 0;
	min-width: 0;
	position: relative;
	overflow: hidden;
	background: var(--ge-bg);
	outline: none;
	transition: box-shadow 0.2s ease;
}

.editor-surface--drag-hint {
	box-shadow: inset 0 0 0 2px #22c55e;
}

.message-log-overlay {
	position: absolute;
	top: 12px;
	right: 12px;
	bottom: 12px;
	z-index: 5;
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	max-width: calc(100% - 24px);
	pointer-events: none;
}

.editor-surface :deep(.pixi-container) {
	width: 100%;
	height: 100%;
}

.visually-hidden {
	position: absolute;
	width: 1px;
	height: 1px;
	padding: 0;
	margin: -1px;
	overflow: hidden;
	clip: rect(0, 0, 0, 0);
	white-space: nowrap;
	border: 0;
}

.pipe-draw-hint {
	margin: 8px 0 0;
	padding: 6px 8px;
	border-radius: 6px;
	border: 1px solid var(--ge-hint-warn-border);
	background: var(--ge-hint-warn-bg);
	color: var(--ge-hint-warn-text);
	font-size: 11px;
	line-height: 1.4;
}

.pipe-draw-hint kbd {
	font-family: inherit;
	padding: 0.05rem 0.35rem;
	border: 1px solid var(--ge-hint-warn-border);
	border-radius: 4px;
	background: #292524;
}
</style>
