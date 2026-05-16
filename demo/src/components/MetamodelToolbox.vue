<script setup lang="ts">
import {
	MM_DRAG_MIME,
	getToolboxPaletteItems,
	type MetamodelDragPayload,
} from "../data/metamodel-db.stub";

const items = getToolboxPaletteItems();

function buildDragPayload(type: (typeof items)[number]): MetamodelDragPayload {
	return {
		objectTypeId: type.id,
		code: type.code,
		name: type.name,
		graphObjectType: type.graphObjectType,
	};
}

function onDragStart(e: DragEvent, type: (typeof items)[number]) {
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
		<ul class="toolbox__list">
			<li
				v-for="t in items"
				:key="t.id"
				class="toolbox__item"
				draggable="true"
				@dragstart="(e) => onDragStart(e, t)"
			>
				<span class="toolbox__icon" aria-hidden="true">
					<!-- поставщик: квадрат + стрелка -->
					<svg
						v-if="t.code === 'supplier'"
						viewBox="0 0 48 48"
						width="44"
						height="44"
					>
						<rect
							x="4"
							y="10"
							width="22"
							height="28"
							fill="#404040"
							stroke="#e5e5e5"
							stroke-width="2"
						/>
						<polygon points="28,24 40,18 40,30" fill="#fafafa" />
					</svg>
					<!-- потребитель: треугольник -->
					<svg
						v-else-if="t.code === 'consumer'"
						viewBox="0 0 56 48"
						width="48"
						height="44"
					>
						<polygon
							points="4,4 4,44 48,24"
							fill="#a3a3a3"
							stroke="#000"
							stroke-width="2"
						/>
						<polygon points="12,24 36,14 36,34" fill="#0a0a0a" />
					</svg>
					<!-- труба -->
					<svg
						v-else-if="t.code === 'pipe'"
						viewBox="0 0 48 16"
						width="48"
						height="16"
					>
						<rect
							x="2"
							y="4"
							width="44"
							height="8"
							rx="2"
							fill="#737373"
							stroke="#404040"
							stroke-width="1"
						/>
					</svg>
					<!-- задвижка -->
					<svg
						v-else-if="t.code === 'gate_valve'"
						viewBox="0 0 48 48"
						width="44"
						height="44"
					>
						<polygon
							points="24,8 40,24 24,40 8,24"
							fill="#ef4444"
							stroke="#7f1d1d"
							stroke-width="2"
						/>
					</svg>
				</span>
				<span class="toolbox__label">{{ t.name }}</span>
				<span class="toolbox__code" :title="t.id">{{ t.code }}</span>
			</li>
		</ul>
	</aside>
</template>

<style scoped>
.toolbox {
	width: 168px;
	min-height: 100%;
	flex-shrink: 0;
	background: #000000;
	color: #e5e5e5;
	font-family:
		system-ui,
		-apple-system,
		"Segoe UI",
		sans-serif;
	font-size: 13px;
	border-right: 1px solid #262626;
	padding: 10px 8px 12px;
	box-sizing: border-box;
}

.toolbox__title {
	font-weight: 600;
	letter-spacing: 0.02em;
	margin-bottom: 4px;
	color: #fafafa;
}

.toolbox__hint {
	font-size: 11px;
	color: #a3a3a3;
	margin-bottom: 12px;
	line-height: 1.3;
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
	border: 1px solid #404040;
	background: #0a0a0a;
	cursor: grab;
	user-select: none;
	transition:
		background 0.12s ease,
		border-color 0.12s ease;
}

.toolbox__item:hover {
	border-color: #525252;
	background: #171717;
}

.toolbox__item:active {
	cursor: grabbing;
}

.toolbox__icon {
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 44px;
}

.toolbox__label {
	text-align: center;
	line-height: 1.2;
	color: #fafafa;
	font-size: 12px;
}

.toolbox__code {
	font-size: 10px;
	color: #737373;
	font-family: ui-monospace, monospace;
	max-width: 100%;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
