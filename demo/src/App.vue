<script setup lang="ts">
import { ref } from "vue";
import { GraphicalEditor } from "../../packages/core/src/ui";
import MetamodelToolbox from "./components/MetamodelToolbox.vue";
import { baseApiObjects } from "./data/base-objects";
import {
	MM_DRAG_MIME,
	parseMetamodelDragPayload,
} from "./data/metamodel-db.stub";
import { mapApiToEditorPayload } from "./lib/editor-adapter";
import { clientToWorld } from "./lib/client-to-world";
import { createInstanceFromMetamodelDrop } from "./lib/metamodel-drop";
import { DemoTool } from "./tools/demo-tool";

const panelRef = ref<HTMLElement | null>(null);
const tool = new DemoTool();
const payload = mapApiToEditorPayload(baseApiObjects);
const objects = ref(payload.objects);
const descriptions = ref(payload.descriptions);

function onEditorDragOver(e: DragEvent) {
	const dt = e.dataTransfer;
	if (!dt) return;
	if (
		dt.types.includes(MM_DRAG_MIME) ||
		dt.types.includes("application/json")
	) {
		e.preventDefault();
		dt.dropEffect = "copy";
	}
}

function onEditorDrop(e: DragEvent) {
	const dt = e.dataTransfer;
	if (!dt) return;
	const raw =
		dt.getData(MM_DRAG_MIME) || dt.getData("application/json");
	const payloadDrop = parseMetamodelDragPayload(raw);
	if (!payloadDrop) return;
	const world = clientToWorld(e.clientX, e.clientY);
	if (!world) return;
	e.preventDefault();
	try {
		const next = createInstanceFromMetamodelDrop(
			payloadDrop,
			world,
			objects.value,
			descriptions.value,
		);
		objects.value = [...objects.value, next];
	} catch {
		/* нет дескриптора для типа */
	}
}
</script>

<template>
	<div class="layout">
		<MetamodelToolbox />
		<div class="work">
			<section
				ref="panelRef"
				class="panel"
				@dragover="onEditorDragOver"
				@drop="onEditorDrop"
			>
				<h1>Graphical Editor Demo</h1>
				<p>
					Тестовое приложение: ядро
					<code>@graphical-editor/core</code>, палитра типов из заглушки БД
					метамодели, перетаскивание на схему (экземпляры).
				</p>

				<GraphicalEditor
					v-model:objects="objects"
					:win-ref="panelRef"
					:descriptions="descriptions"
					:tool="tool"
				/>
			</section>
		</div>
	</div>
</template>

<style scoped>
.layout {
	min-height: 100vh;
	display: flex;
	flex-direction: row;
	align-items: stretch;
	background: #0f172a;
	font-family:
		system-ui,
		-apple-system,
		BlinkMacSystemFont,
		"Segoe UI",
		sans-serif;
}

.work {
	flex: 1;
	display: flex;
	justify-content: center;
	align-items: flex-start;
	padding: 1.5rem;
	box-sizing: border-box;
}

.panel {
	max-width: 1100px;
	width: 100%;
	padding: 1.5rem 1.5rem 2rem;
	border-radius: 0.75rem;
	background: #f8fafc;
	box-shadow: 0 18px 45px rgba(15, 23, 42, 0.35);
}

h1 {
	margin: 0 0 0.75rem;
	font-size: 1.5rem;
	color: #0f172a;
}

p {
	margin: 0 0 1rem;
	color: #475569;
	font-size: 0.95rem;
	line-height: 1.45;
}

code {
	font-family:
		ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
		"Liberation Mono", "Courier New", monospace;
	background: #e2e8f0;
	padding: 0.1rem 0.35rem;
	border-radius: 0.25rem;
	font-size: 0.88em;
}
</style>
