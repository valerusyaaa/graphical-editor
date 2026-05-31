<script setup lang="ts">

import { computed, inject } from "vue";

import { storeToRefs } from "pinia";

import type { GraphicObjectDto, ObjectBaseData } from "../api/types";

import { useEditorClipboardStore } from "../model/stores/editor-clipboard.store";

import { useGraphicSchemeStore } from "../model/stores/graphic-scheme.store";

import { findMonitorForSource } from "../lib/monitor-object";

import { readBackendProperties } from "../lib/object-fixed-on-scheme";

import { isValveOpenFromProperties } from "../lib/valve-state";

import {
	isChartableSchemeObject,
} from "../lib/chart-object-map";
import {

	isMonitorFeature,

	isValveFeature,

} from "../model/schema/feature-type-aliases";

import { SCHEMA_EDITOR_OBJECTS_KEY } from "./schema-editor-inject";



const clip = useEditorClipboardStore();

const graphicSchemeStore = useGraphicSchemeStore();

const { menu, canPaste } = storeToRefs(clip);

const schemaObjects = inject(SCHEMA_EDITOR_OBJECTS_KEY, null);



const hasSelection = computed(

	() =>

		(menu.value.operationIds?.length ?? 0) > 0 ||

		graphicSchemeStore.selectedObjectIds.length > 0,

);



function runMenuAction(action: () => void, event: MouseEvent) {

	if (event.button !== 0) return;

	event.preventDefault();

	event.stopPropagation();

	try {

		action();

	} finally {

		clip.closeMenu();

	}

}



function copy(e: MouseEvent) {

	runMenuAction(() => clip.copyFocusedOrMenuTarget(), e);

}



function cut(e: MouseEvent) {

	runMenuAction(() => clip.cutFocusedOrMenuTarget(), e);

}



function del(e: MouseEvent) {

	runMenuAction(() => clip.deleteFocusedOrMenuTarget(), e);

}



function front(e: MouseEvent) {

	runMenuAction(() => {

		const id = menu.value.targetId;

		if (id != null) clip.bringToFront(id);

	}, e);

}



function back(e: MouseEvent) {

	runMenuAction(() => {

		const id = menu.value.targetId;

		if (id != null) clip.sendToBack(id);

	}, e);

}



function pasteHere(e: MouseEvent) {

	runMenuAction(() => clip.pasteAtScreen(menu.value.screenX, menu.value.screenY), e);

}



function rotate90(e: MouseEvent) {

	runMenuAction(() => clip.rotateMenuTarget90(), e);

}



function selectAll(e: MouseEvent) {

	runMenuAction(() => clip.selectAll(), e);

}



const isPointerTarget = () =>

	!menu.value.isPane && menu.value.targetGraph === "pointer";



const fixOperationIds = computed(() => {

	if (menu.value.isPane) return [];

	const op = menu.value.operationIds;

	if (op.length > 0) return op;

	const id = menu.value.targetId;

	return id != null ? [id] : [];

});



const isMenuTargetFixed = computed(() => {

	const ids = fixOperationIds.value;

	return ids.length > 0 && ids.every((id) => clip.isObjectFixed(id));

});



function fixObject(e: MouseEvent) {

	runMenuAction(() => clip.fixMenuTarget(), e);

}



function unfixObject(e: MouseEvent) {

	runMenuAction(() => clip.unfixMenuTarget(), e);

}



const menuTargetId = computed(() =>

	menu.value.isPane ? null : menu.value.targetId,

);



const menuTargetObject = computed((): GraphicObjectDto<ObjectBaseData> | null => {

	const id = menuTargetId.value;

	if (id == null) return null;

	const list = schemaObjects?.value ?? clip.bridge?.getObjects() ?? [];

	return list.find((o) => o.id === id) ?? null;

});



const isValveMenuTarget = computed(() => {

	const o = menuTargetObject.value;

	return o != null && isValveFeature(o.featureObjectType);

});



const valveIsOpen = computed(() => {

	const o = menuTargetObject.value;

	if (!o || !isValveFeature(o.featureObjectType)) return false;

	return isValveOpenFromProperties(readBackendProperties(o.data));

});



function toggleValveOpen(e: MouseEvent) {

	runMenuAction(() => {

		clip.setMenuTargetValveOpen(!valveIsOpen.value);

	}, e);

}



const canShowMonitor = computed(() => {

	const id = menuTargetId.value;

	if (id == null) return false;

	return clip.bridge?.canShowMonitorFor?.(id) ?? false;

});



const hasMonitorForTarget = computed(() => {

	const id = menuTargetId.value;

	if (id == null) return false;

	const list = schemaObjects?.value ?? clip.bridge?.getObjects() ?? [];

	return findMonitorForSource(list, id) != null;

});



function toggleMonitorProperties(e: MouseEvent) {

	runMenuAction(() => {

		const id = menuTargetId.value;

		if (id != null) clip.bridge?.toggleMonitorForSource?.(id);

	}, e);

}



const isMonitorMenuTarget = computed(() => {

	const o = menuTargetObject.value;

	return o != null && isMonitorFeature(o.featureObjectType);

});

const chartableMenuIds = computed(() => {
	const ids = menu.value.isPane
		? menu.value.operationIds.length > 0
			? menu.value.operationIds
			: [...graphicSchemeStore.selectedObjectIds]
		: fixOperationIds.value;
	const list = schemaObjects?.value ?? clip.bridge?.getObjects() ?? [];
	return ids.filter((id) => {
		const o = list.find((x) => x.id === id);
		return o != null && isChartableSchemeObject(o);
	});
});

const canBuildCharts = computed(() => chartableMenuIds.value.length > 0);

function buildCharts(e: MouseEvent) {
	runMenuAction(() => {
		clip.bridge?.openChartsForSchemeObjectIds?.(chartableMenuIds.value);
	}, e);
}

</script>



<template>

	<Teleport to="body">

		<div

			v-if="menu.visible"

			class="schema-editor-ctx-menu"

			:style="{

				left: `${menu.screenX + 2}px`,

				top: `${menu.screenY + 2}px`,

			}"

			@contextmenu.prevent

		>

			<template v-if="menu.isPane">

				<button

					type="button"

					:disabled="!canPaste"

					@mousedown="pasteHere"

				>

					Вставить

				</button>

				<template v-if="hasSelection">

					<button type="button" @mousedown="copy">Копировать</button>

					<button type="button" @mousedown="cut">Вырезать</button>

					<button type="button" class="danger" @mousedown="del">

						Удалить

					</button>

					<hr class="sep" />

				</template>

				<template v-if="canBuildCharts">

					<button type="button" @mousedown="buildCharts">

						Построить график

					</button>

					<hr class="sep" />

				</template>

				<button type="button" @mousedown="selectAll">

					Выбрать всё

				</button>

			</template>

			<template v-else>

				<button

					v-if="!isMenuTargetFixed"

					type="button"

					@mousedown="fixObject"

				>

					Фиксировать

				</button>

				<button

					v-else

					type="button"

					@mousedown="unfixObject"

				>

					Расфиксировать

				</button>

				<template v-if="canShowMonitor">

					<button type="button" @mousedown="toggleMonitorProperties">

						{{

							hasMonitorForTarget

								? "Скрыть свойства"

								: "Отобразить свойства"

						}}

					</button>

				</template>

				<template v-if="isValveMenuTarget">

					<button type="button" @mousedown="toggleValveOpen">

						{{ valveIsOpen ? "Закрыть" : "Открыть" }}

					</button>

				</template>

				<template v-if="canBuildCharts">

					<button type="button" @mousedown="buildCharts">

						Построить график

					</button>

				</template>

				<hr v-if="!isMonitorMenuTarget" class="sep" />

				<button type="button" @mousedown="copy">Копировать</button>

				<button type="button" @mousedown="cut">Вырезать</button>

				<button type="button" class="danger" @mousedown="del">

					Удалить

				</button>

				<hr class="sep" />

				<button

					v-if="isPointerTarget() && !isMonitorMenuTarget"

					type="button"

					@mousedown="rotate90"

				>

					Повернуть на 90°

				</button>

				<button type="button" @mousedown="selectAll">

					Выбрать всё

				</button>

				<hr class="sep" />

				<button type="button" @mousedown="front">

					На передний план

				</button>

				<button type="button" @mousedown="back">

					На задний план

				</button>

			</template>

		</div>

	</Teleport>

</template>



<style scoped>

.schema-editor-ctx-menu {

	position: fixed;

	z-index: 100000;

	min-width: 11rem;

	padding: 0.25rem 0;

	border-radius: 6px;

	background: var(--ge-bg-elevated, #252526);

	border: 1px solid var(--ge-border, #454545);

	box-shadow: 0 12px 32px rgba(0, 0, 0, 0.55);

	display: flex;

	flex-direction: column;

	gap: 1px;

	font-size: 0.8125rem;

}



.schema-editor-ctx-menu button {

	display: block;

	width: 100%;

	text-align: left;

	padding: 0.45rem 0.75rem;

	border: none;

	background: transparent;

	color: var(--ge-text, #cccccc);

	cursor: pointer;

	font: inherit;

}



.schema-editor-ctx-menu button:hover:not(:disabled) {

	background: var(--ge-bg-hover, #2a2d2e);

}



.schema-editor-ctx-menu button:disabled {

	opacity: 0.45;

	cursor: not-allowed;

}



.schema-editor-ctx-menu button.danger {

	color: var(--ge-danger, #f87171);

}



.sep {

	border: none;

	border-top: 1px solid var(--ge-border-subtle, #333333);

	margin: 0.2rem 0;

}

</style>

