<script setup lang="ts">
import type { PropertyPath, PropertyTreeNode } from "../lib/backend-properties";

defineProps<{
	nodes: PropertyTreeNode[];
	depth?: number;
}>();

const emit = defineEmits<{
	change: [path: PropertyPath, value: string];
}>();

function onInput(path: PropertyPath, ev: Event) {
	emit("change", path, (ev.target as HTMLInputElement).value);
}

function onBooleanChange(path: PropertyPath, ev: Event) {
	emit("change", path, (ev.target as HTMLSelectElement).value);
}

function onValveStateChange(path: PropertyPath, ev: Event) {
	emit("change", path, (ev.target as HTMLSelectElement).value);
}
</script>

<template>
	<template v-for="node in nodes" :key="node.kind === 'section' ? node.key : node.path.join('.')">
		<div
			v-if="node.kind === 'section'"
			class="props-section"
			:class="{ 'props-section--readonly': node.readOnly, 'props-section--nested': (depth ?? 0) > 0 }"
		>
			<div class="props-section__head props-section__head--static">
				<span>{{ node.title }}</span>
				<span v-if="node.readOnly" class="props-section__badge">расчёт</span>
			</div>
			<div class="props-section__grid">
				<PropertyTreeNodes
					:nodes="node.children"
					:depth="(depth ?? 0) + 1"
					@change="(p, v) => emit('change', p, v)"
				/>
			</div>
		</div>
		<div
			v-else
			class="props-row"
			:class="{ 'props-row--readonly': node.readOnly }"
		>
			<label class="props-row__label" :for="'pf-' + node.path.join('-')">{{ node.label }}</label>
			<select
				v-if="node.fieldType === 'valveState' && !node.readOnly"
				:id="'pf-' + node.path.join('-')"
				class="props-row__input props-row__select"
				:value="node.value === '1' ? '1' : '0'"
				@change="onValveStateChange(node.path, $event)"
			>
				<option value="0">открыт</option>
				<option value="1">закрыт</option>
			</select>
			<select
				v-else-if="node.fieldType === 'boolean' && !node.readOnly"
				:id="'pf-' + node.path.join('-')"
				class="props-row__input props-row__select"
				:value="node.value === 'True' ? 'True' : 'False'"
				@change="onBooleanChange(node.path, $event)"
			>
				<option value="True">True</option>
				<option value="False">False</option>
			</select>
			<input
				v-else-if="node.fieldType === 'int' && !node.readOnly"
				:id="'pf-' + node.path.join('-')"
				class="props-row__input"
				type="number"
				step="1"
				inputmode="numeric"
				:value="node.value"
				@input="onInput(node.path, $event)"
			/>
			<input
				v-else
				:id="'pf-' + node.path.join('-')"
				class="props-row__input"
				:value="node.value"
				:readonly="node.readOnly"
				@input="onInput(node.path, $event)"
			/>
		</div>
	</template>
</template>

<style scoped>
.props-section--nested .props-section__head--static {
	background: var(--ge-bg-elevated, #0a0a0a);
	padding: 0.25rem 8px;
	font-size: 11px;
	font-weight: 600;
	color: var(--ge-text-muted, #a3a3a3);
}

.props-section__head--static {
	display: flex;
	align-items: center;
	gap: 0.35rem;
}

.props-section__badge {
	margin-left: auto;
	font-size: 0.65rem;
	color: var(--ge-hint-warn-text, #fbbf24);
}

.props-row {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 0.25rem 0.4rem;
	padding: 4px 8px;
	border-bottom: 1px solid var(--ge-row-border, #1a1a1a);
	align-items: center;
}

.props-row--readonly .props-row__input {
	opacity: 0.75;
	cursor: default;
}

.props-row__label {
	color: var(--ge-text-muted, #a3a3a3);
	line-height: 1.25;
	word-break: break-word;
	font-size: 11px;
}

.props-row__input {
	width: 100%;
	box-sizing: border-box;
	padding: 3px 5px;
	border: 1px solid var(--ge-border, #404040);
	border-radius: 4px;
	background: var(--ge-bg-elevated, #0a0a0a);
	color: var(--ge-text, #fafafa);
	font: inherit;
	font-size: 11px;
}

.props-row__input:focus {
	outline: none;
	border-color: var(--ge-focus, #525252);
}

.props-row__select {
	cursor: pointer;
}
</style>
