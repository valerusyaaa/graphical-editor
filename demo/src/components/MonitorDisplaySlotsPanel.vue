<script setup lang="ts">
import { computed, ref } from "vue";
import type { GraphicObjectDto, ObjectBaseData } from "../../../packages/core/src/api/types";
import {
	MONITOR_SLOT_COUNT,
	getActiveMonitorSlotKeys,
	listMonitorPropertyCandidates,
	readSourcePropertyValue,
	type MonitorPropertyCandidate,
} from "../../../packages/core/src/lib/monitor-object";
import { readBackendProperties } from "../../../packages/core/src/lib/object-fixed-on-scheme";
import { roundNumericToString } from "../lib/numeric-format";
import { featureLabelForMonitor } from "../../../packages/core/src/lib/registration-id";

const props = defineProps<{
	monitor: GraphicObjectDto<ObjectBaseData>;
	source: GraphicObjectDto<ObjectBaseData> | null;
}>();

const emit = defineEmits<{
	change: [selectedKeys: string[]];
}>();

const filter = ref("");

const sourceLabel = computed(() => {
	if (!props.source) return "объект не найден";
	return `${featureLabelForMonitor(props.source.featureObjectType)} (id ${props.source.id})`;
});

const sourceProps = computed(() => readBackendProperties(props.source?.data));

const candidates = computed(() =>
	listMonitorPropertyCandidates(sourceProps.value),
);

const selectedKeys = computed(() =>
	getActiveMonitorSlotKeys(props.monitor.data),
);

const selectedSet = computed(() => new Set(selectedKeys.value));

const filteredCandidates = computed(() => {
	const q = filter.value.trim().toLowerCase();
	if (!q) return candidates.value;
	return candidates.value.filter(
		(c) =>
			c.key.toLowerCase().includes(q) ||
			c.label.toLowerCase().includes(q),
	);
});

const groupedCandidates = computed(() => {
	const groups = new Map<string, MonitorPropertyCandidate[]>();
	for (const c of filteredCandidates.value) {
		const g = c.sectionPath || "Основные";
		const list = groups.get(g) ?? [];
		list.push(c);
		groups.set(g, list);
	}
	return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b, "ru"));
});

const atSlotLimit = computed(
	() => selectedKeys.value.length >= MONITOR_SLOT_COUNT,
);

function previewValue(key: string): string {
	if (!sourceProps.value) return "—";
	const v = readSourcePropertyValue(sourceProps.value, key);
	return v === "" ? "—" : roundNumericToString(v);
}

function toggleKey(key: string, checked: boolean) {
	let next = [...selectedKeys.value];
	if (checked) {
		if (next.includes(key) || next.length >= MONITOR_SLOT_COUNT) return;
		next.push(key);
	} else {
		next = next.filter((k) => k !== key);
	}
	emit("change", next);
}

function moveKey(key: string, dir: -1 | 1) {
	const next = [...selectedKeys.value];
	const i = next.indexOf(key);
	if (i < 0) return;
	const j = i + dir;
	if (j < 0 || j >= next.length) return;
	[next[i], next[j]] = [next[j]!, next[i]!];
	emit("change", next);
}
</script>

<template>
	<section class="monitor-slots" aria-label="Параметры на мониторе">
		<div class="monitor-slots__head">
			<div class="monitor-slots__title">Параметры на мониторе</div>
			<div class="monitor-slots__source">Источник: {{ sourceLabel }}</div>
			<div class="monitor-slots__hint">
				Кликните по блоку с цифрами на схеме, отметьте до
				{{ MONITOR_SLOT_COUNT }} параметров — они появятся на мониторе.
			</div>
		</div>

		<div v-if="selectedKeys.length" class="monitor-slots__order">
			<div class="monitor-slots__order-title">Порядок на схеме</div>
			<ul class="monitor-slots__order-list">
				<li
					v-for="(key, idx) in selectedKeys"
					:key="key"
					class="monitor-slots__order-item"
				>
					<span class="monitor-slots__order-label">{{ key }}</span>
					<span class="monitor-slots__order-value">{{ previewValue(key) }}</span>
					<span class="monitor-slots__order-actions">
						<button
							type="button"
							class="monitor-slots__icon-btn"
							title="Выше"
							:disabled="idx === 0"
							@click="moveKey(key, -1)"
						>
							▲
						</button>
						<button
							type="button"
							class="monitor-slots__icon-btn"
							title="Ниже"
							:disabled="idx === selectedKeys.length - 1"
							@click="moveKey(key, 1)"
						>
							▼
						</button>
					</span>
				</li>
			</ul>
		</div>

		<input
			v-model="filter"
			type="search"
			class="monitor-slots__filter"
			placeholder="Поиск параметра…"
			:disabled="!candidates.length"
		/>

		<div v-if="!source" class="monitor-slots__empty">
			Связанный объект удалён — выберите монитор заново.
		</div>
		<div v-else-if="!candidates.length" class="monitor-slots__empty">
			У объекта нет параметров для отображения.
		</div>
		<div v-else class="monitor-slots__list">
			<div
				v-for="[section, items] in groupedCandidates"
				:key="section"
				class="monitor-slots__group"
			>
				<div class="monitor-slots__group-title">{{ section }}</div>
				<label
					v-for="c in items"
					:key="c.key"
					class="monitor-slots__row"
					:class="{
						'monitor-slots__row--checked': selectedSet.has(c.key),
						'monitor-slots__row--disabled':
							!selectedSet.has(c.key) && atSlotLimit,
					}"
				>
					<input
						type="checkbox"
						:checked="selectedSet.has(c.key)"
						:disabled="!selectedSet.has(c.key) && atSlotLimit"
						@change="
							toggleKey(
								c.key,
								($event.target as HTMLInputElement).checked,
							)
						"
					/>
					<span class="monitor-slots__row-main">
						<span class="monitor-slots__row-key">{{ c.key }}</span>
						<span class="monitor-slots__row-preview">{{
							previewValue(c.key)
						}}</span>
					</span>
				</label>
			</div>
			<p v-if="atSlotLimit" class="monitor-slots__limit">
				Достигнут лимит ({{ MONITOR_SLOT_COUNT }}). Снимите отметку, чтобы добавить другой параметр.
			</p>
		</div>
	</section>
</template>

<style scoped>
.monitor-slots {
	flex-shrink: 0;
	border-bottom: 1px solid var(--ge-border-subtle, #262626);
	max-height: 42vh;
	display: flex;
	flex-direction: column;
	min-height: 0;
}

.monitor-slots__head {
	padding: 8px;
	flex-shrink: 0;
}

.monitor-slots__title {
	font-size: 11px;
	font-weight: 600;
	color: var(--ge-text-muted, #a3a3a3);
	margin-bottom: 4px;
}

.monitor-slots__source {
	font-size: 12px;
	font-weight: 600;
	color: var(--ge-text, #fafafa);
	line-height: 1.3;
}

.monitor-slots__hint {
	margin-top: 4px;
	font-size: 10px;
	color: var(--ge-text-muted, #737373);
	line-height: 1.35;
}

.monitor-slots__order {
	padding: 0 8px 6px;
	flex-shrink: 0;
}

.monitor-slots__order-title {
	font-size: 10px;
	font-weight: 600;
	color: var(--ge-text-muted, #a3a3a3);
	margin-bottom: 4px;
}

.monitor-slots__order-list {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.monitor-slots__order-item {
	display: grid;
	grid-template-columns: 1fr auto auto;
	gap: 4px;
	align-items: center;
	font-size: 11px;
	padding: 3px 4px;
	background: var(--ge-bg-elevated, #0a0a0a);
	border-radius: 4px;
}

.monitor-slots__order-label {
	color: var(--ge-text, #fafafa);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.monitor-slots__order-value {
	color: var(--ge-text-muted, #a3a3a3);
	font-variant-numeric: tabular-nums;
}

.monitor-slots__order-actions {
	display: flex;
	gap: 2px;
}

.monitor-slots__icon-btn {
	border: none;
	background: transparent;
	color: var(--ge-text-muted, #a3a3a3);
	cursor: pointer;
	padding: 0 2px;
	font-size: 10px;
	line-height: 1;
}

.monitor-slots__icon-btn:hover:not(:disabled) {
	color: var(--ge-text, #fafafa);
}

.monitor-slots__icon-btn:disabled {
	opacity: 0.35;
	cursor: default;
}

.monitor-slots__filter {
	margin: 0 8px 6px;
	padding: 4px 6px;
	border: 1px solid var(--ge-border, #404040);
	border-radius: 4px;
	background: var(--ge-bg-elevated, #0a0a0a);
	color: var(--ge-text, #fafafa);
	font: inherit;
	font-size: 11px;
	flex-shrink: 0;
}

.monitor-slots__list {
	overflow: auto;
	flex: 1;
	min-height: 0;
	padding: 0 0 8px;
}

.monitor-slots__group-title {
	padding: 6px 8px 4px;
	font-size: 10px;
	font-weight: 600;
	color: var(--ge-text-muted, #a3a3a3);
	position: sticky;
	top: 0;
	background: var(--ge-bg, #000);
	z-index: 1;
}

.monitor-slots__row {
	display: flex;
	align-items: flex-start;
	gap: 6px;
	padding: 4px 8px;
	cursor: pointer;
	border-bottom: 1px solid var(--ge-row-border, #1a1a1a);
}

.monitor-slots__row:hover {
	background: var(--ge-bg-hover, #171717);
}

.monitor-slots__row--disabled {
	opacity: 0.45;
	cursor: not-allowed;
}

.monitor-slots__row-main {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 1px;
}

.monitor-slots__row-key {
	font-size: 11px;
	color: var(--ge-text, #fafafa);
	word-break: break-word;
}

.monitor-slots__row-preview {
	font-size: 10px;
	color: var(--ge-text-muted, #737373);
	font-variant-numeric: tabular-nums;
}

.monitor-slots__empty {
	padding: 8px;
	font-size: 11px;
	color: var(--ge-text-muted, #a3a3a3);
}

.monitor-slots__limit {
	margin: 6px 8px 0;
	font-size: 10px;
	color: var(--ge-hint-warn-text, #fbbf24);
	line-height: 1.35;
}

input[type="checkbox"] {
	margin-top: 2px;
	flex-shrink: 0;
}
</style>
