<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useEditorClipboardStore } from "../model/stores/editor-clipboard.store";

const clip = useEditorClipboardStore();
const { menu, canPaste } = storeToRefs(clip);

function stop(e: Event) {
	e.stopPropagation();
}

function copy() {
	if (menu.value.targetId != null) clip.copyObject(menu.value.targetId);
	clip.closeMenu();
}

function cut() {
	if (menu.value.targetId != null) clip.cutObject(menu.value.targetId);
}

function del() {
	if (menu.value.targetId != null) clip.deleteObject(menu.value.targetId);
}

function front() {
	if (menu.value.targetId != null) clip.bringToFront(menu.value.targetId);
}

function back() {
	if (menu.value.targetId != null) clip.sendToBack(menu.value.targetId);
}

function pasteHere() {
	clip.pasteAtScreen(menu.value.screenX, menu.value.screenY);
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
			@mousedown="stop"
		>
			<template v-if="menu.isPane">
				<button type="button" :disabled="!canPaste" @click="pasteHere">
					Вставить
				</button>
			</template>
			<template v-else>
				<button type="button" @click="copy">Копировать</button>
				<button type="button" @click="cut">Вырезать</button>
				<button type="button" class="danger" @click="del">Удалить</button>
				<hr class="sep" />
				<button type="button" @click="front">На передний план</button>
				<button type="button" @click="back">На задний план</button>
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
	border-radius: 0.375rem;
	background: #1e293b;
	border: 1px solid #334155;
	box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
	display: flex;
	flex-direction: column;
	gap: 1px;
	font-size: 0.875rem;
}

.schema-editor-ctx-menu button {
	display: block;
	width: 100%;
	text-align: left;
	padding: 0.45rem 0.75rem;
	border: none;
	background: transparent;
	color: #f1f5f9;
	cursor: pointer;
	font: inherit;
}

.schema-editor-ctx-menu button:hover:not(:disabled) {
	background: #334155;
}

.schema-editor-ctx-menu button:disabled {
	opacity: 0.45;
	cursor: not-allowed;
}

.schema-editor-ctx-menu button.danger {
	color: #fecaca;
}

.sep {
	border: none;
	border-top: 1px solid #334155;
	margin: 0.2rem 0;
}
</style>
