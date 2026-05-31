<script setup lang="ts">
import {
	MM_DRAG_MIME,
	type MetamodelDragPayload,
	type MetamodelObjectType,
} from "../data/metamodel-db.stub";
import {
	metamodelPaletteItems,
	metamodelRemoteHint,
} from "../lib/metamodel-startup";
import ToolboxObjectIcon from "./ToolboxObjectIcon.vue";

const items = metamodelPaletteItems;
const remoteHint = metamodelRemoteHint;

function buildDragPayload(type: MetamodelObjectType): MetamodelDragPayload {
	return {
		objectTypeId: type.id,
		code: type.code,
		name: type.name,
		graphObjectType: type.graphObjectType,
	};
}

function onDragStart(e: DragEvent, type: MetamodelObjectType) {
	const payload = buildDragPayload(type);
	const json = JSON.stringify(payload);
	e.dataTransfer?.setData(MM_DRAG_MIME, json);
	e.dataTransfer?.setData("application/json", json);
	e.dataTransfer?.setData("text/plain", `${type.code}:${type.id}`);
	if (e.dataTransfer) e.dataTransfer.effectAllowed = "copy";
}
</script>

<template>
	<aside class="toolbox" aria-label="Палитра типов объектов метамодели">
		<div class="toolbox__title">Объекты</div>
		<div class="toolbox__hint">Перетащите на схему</div>
		<p v-if="remoteHint" class="toolbox__remote-hint">{{ remoteHint }}</p>
		<ul class="toolbox__list">
			<li
				v-for="t in items"
				:key="t.id"
				class="toolbox__item"
				draggable="true"
				@dragstart="(e) => onDragStart(e, t)"
			>
				<span class="toolbox__icon" aria-hidden="true">
					<ToolboxObjectIcon :code="t.code" />
				</span>
				<span class="toolbox__label">{{ t.name }}</span>
			</li>
		</ul>
	</aside>
</template>

<style scoped>
.toolbox {
	width: 100%;
	height: 100%;
	min-height: min-content;
	box-sizing: border-box;
	background: var(--ge-bg, #000000);
	color: var(--ge-text-muted, #e5e5e5);
	font-family:
		system-ui,
		-apple-system,
		"Segoe UI",
		sans-serif;
	font-size: 13px;
	padding: 10px 8px 12px;
	box-sizing: border-box;
}

.toolbox__title {
	font-weight: 600;
	letter-spacing: 0.02em;
	margin-bottom: 4px;
	color: var(--ge-text, #fafafa);
}

.toolbox__hint {
	font-size: 11px;
	color: var(--ge-text-muted, #a3a3a3);
	margin-bottom: 12px;
	line-height: 1.3;
}

.toolbox__remote-hint {
	font-size: 10px;
	color: #fbbf24;
	margin: -6px 0 10px;
	line-height: 1.35;
}

.toolbox__list {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.toolbox__item {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 6px;
	padding: 10px 6px;
	border-radius: 6px;
	border: 1px solid var(--ge-border, #404040);
	background: var(--ge-bg-elevated, #0a0a0a);
	cursor: grab;
	user-select: none;
	transition:
		background 0.12s ease,
		border-color 0.12s ease;
}

.toolbox__item:hover {
	border-color: var(--ge-focus, #525252);
	background: var(--ge-bg-hover, #171717);
}

.toolbox__item:active {
	cursor: grabbing;
}

.toolbox__icon {
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 48px;
}

.toolbox__label {
	text-align: center;
	line-height: 1.2;
	color: var(--ge-text, #fafafa);
	font-size: 12px;
}
</style>
