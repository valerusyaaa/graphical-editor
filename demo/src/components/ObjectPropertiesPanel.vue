<script setup lang="ts">

import { computed, ref, watch } from "vue";

import {

	buildPropertyTree,

	type PropertyPath,

} from "../lib/backend-properties";

import PropertyTreeNodes from "./PropertyTreeNodes.vue";



const props = defineProps<{

	title: string;

	subtitle?: string;

	properties: Record<string, unknown>;

}>();



const emit = defineEmits<{

	change: [path: PropertyPath, value: string];

}>();



const collapsed = ref<Record<string, boolean>>({});



const tree = computed(() => buildPropertyTree(props.properties));



watch(

	() => props.title,

	() => {

		collapsed.value = {};

	},

);



function toggleSection(key: string) {

	collapsed.value[key] = !collapsed.value[key];

}



function isCollapsed(key: string): boolean {

	return collapsed.value[key] === true;

}



function onFieldChange(path: PropertyPath, value: string) {

	emit("change", path, value);

}

</script>



<template>

	<aside class="props-panel" aria-label="Свойства объекта">

		<div class="props-panel__head">

			<div class="props-panel__title">Свойства объекта</div>

			<div v-if="title" class="props-panel__target">{{ title }}</div>

			<div v-if="subtitle" class="props-panel__subtitle">{{ subtitle }}</div>

		</div>



		<div v-if="!tree.length" class="props-panel__empty">

			Нет свойств для отображения. Выделите объект на схеме или загрузите
			схему из файла / API.

		</div>



		<div v-else class="props-panel__body">

			<template

				v-for="node in tree"

				:key="node.kind === 'section' ? node.key : node.path.join('.')"

			>

				<div

					v-if="node.kind === 'section'"

					class="props-section"

					:class="{ 'props-section--readonly': node.readOnly }"

				>

					<button

						type="button"

						class="props-section__head"

						@click="toggleSection(node.key)"

					>

						<span

							class="props-section__caret"

							:class="{ collapsed: isCollapsed(node.key) }"

						>▼</span>

						<span>{{ node.title }}</span>

						<span v-if="node.readOnly" class="props-section__badge">расчёт</span>

					</button>

					<div v-show="!isCollapsed(node.key)" class="props-section__grid">

						<PropertyTreeNodes

							:nodes="node.children"

							@change="onFieldChange"

						/>

					</div>

				</div>

				<div

					v-else

					class="props-row props-row--root"

					:class="{ 'props-row--readonly': node.readOnly }"

				>

					<label class="props-row__label" :for="'pf-' + node.path.join('-')">{{

						node.label

					}}</label>

					<select

						v-if="node.fieldType === 'valveState' && !node.readOnly"

						:id="'pf-' + node.path.join('-')"

						class="props-row__input props-row__select"

						:value="node.value === '1' ? '1' : '0'"

						@change="

							onFieldChange(

								node.path,

								($event.target as HTMLSelectElement).value,

							)

						"

					>

						<option value="0">открыт</option>

						<option value="1">закрыт</option>

					</select>

					<select

						v-else-if="node.fieldType === 'boolean' && !node.readOnly"

						:id="'pf-' + node.path.join('-')"

						class="props-row__input props-row__select"

						:value="node.value === 'True' ? 'True' : 'False'"

						@change="

							onFieldChange(

								node.path,

								($event.target as HTMLSelectElement).value,

							)

						"

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

						@input="

							onFieldChange(

								node.path,

								($event.target as HTMLInputElement).value,

							)

						"

					/>

					<input

						v-else

						:id="'pf-' + node.path.join('-')"

						class="props-row__input"

						:value="node.value"

						:readonly="node.readOnly"

						@input="

							onFieldChange(

								node.path,

								($event.target as HTMLInputElement).value,

							)

						"

					/>

				</div>

			</template>

		</div>

	</aside>

</template>



<style scoped>

.props-panel {

	flex: 1;

	min-height: 0;

	width: 100%;

	display: flex;

	flex-direction: column;

	background: var(--ge-bg, #000);

	color: var(--ge-text, #fafafa);

	font-size: 12px;

	box-sizing: border-box;

}



.props-panel__head {

	padding: 10px 8px 8px;

	border-bottom: 1px solid var(--ge-border-subtle, #262626);

	flex-shrink: 0;

}



.props-panel__title {

	font-size: 11px;

	font-weight: 600;

	letter-spacing: 0.02em;

	color: var(--ge-text-muted, #a3a3a3);

	margin-bottom: 4px;

}



.props-panel__target {

	font-weight: 600;

	color: var(--ge-text, #fafafa);

	line-height: 1.3;

	font-size: 12px;

}



.props-panel__subtitle {

	font-size: 11px;

	color: var(--ge-text-muted, #a3a3a3);

	margin-top: 2px;

	line-height: 1.3;

}



.props-panel__empty {

	padding: 10px 8px;

	color: var(--ge-text-muted, #a3a3a3);

	font-size: 11px;

}



.props-panel__body {

	overflow: auto;

	flex: 1;

	min-height: 0;

	padding: 4px 0 8px;

}



.props-section__head {

	width: 100%;

	display: flex;

	align-items: center;

	gap: 0.35rem;

	padding: 6px 8px;

	border: none;

	border-bottom: 1px solid var(--ge-border-subtle, #262626);

	background: var(--ge-bg-elevated, #0a0a0a);

	color: var(--ge-text, #fafafa);

	font: inherit;

	font-weight: 600;

	font-size: 11px;

	text-align: left;

	cursor: pointer;

}



.props-section__head:hover {

	background: var(--ge-bg-hover, #171717);

}



.props-section--readonly .props-section__head {

	background: var(--ge-section-readonly-bg, #1a1208);

}



.props-section__caret {

	font-size: 0.55rem;

	transition: transform 0.15s ease;

	color: var(--ge-text-muted, #a3a3a3);

}



.props-section__caret.collapsed {

	transform: rotate(-90deg);

}



.props-section__badge {

	margin-left: auto;

	font-size: 0.65rem;

	font-weight: 500;

	color: var(--ge-hint-warn-text, #fbbf24);

}



.props-section__grid {

	border-top: 1px solid var(--ge-border-subtle, #262626);

}



.props-row {

	display: grid;

	grid-template-columns: 1fr 1fr;

	gap: 0.25rem 0.4rem;

	padding: 4px 8px;

	border-bottom: 1px solid var(--ge-row-border, #1a1a1a);

	align-items: center;

}



.props-row--root {

	background: transparent;

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



.props-row__input:read-only {

	background: var(--ge-bg, #050505);

	color: var(--ge-text-dim, #737373);

}

</style>

