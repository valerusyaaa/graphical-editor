<script setup lang="ts">
import { ref } from "vue";
import { useSidebarLayout } from "../composables/use-sidebar-layout";

const sidebarRef = ref<HTMLElement | null>(null);
const { sidebarWidth, toolboxHeight, startWidthResize, startToolboxResize } =
	useSidebarLayout(sidebarRef);
</script>

<template>
	<aside
		ref="sidebarRef"
		class="editor-sidebar"
		:style="{ width: `${sidebarWidth}px` }"
		aria-label="Палитра и свойства"
	>
		<div
			class="editor-sidebar__toolbox"
			:style="{ height: `${toolboxHeight}px` }"
		>
			<slot name="toolbox" />
		</div>
		<div
			class="editor-sidebar__resizer editor-sidebar__resizer--row"
			role="separator"
			aria-orientation="horizontal"
			aria-label="Изменить высоту панели объектов"
			tabindex="0"
			@pointerdown="startToolboxResize"
		/>
		<div class="editor-sidebar__props">
			<slot name="properties" />
		</div>
		<div
			class="editor-sidebar__resizer editor-sidebar__resizer--col"
			role="separator"
			aria-orientation="vertical"
			aria-label="Изменить ширину боковой панели"
			tabindex="0"
			@pointerdown="startWidthResize"
		/>
	</aside>
</template>

<style scoped>
.editor-sidebar {
	position: relative;
	flex-shrink: 0;
	display: flex;
	flex-direction: column;
	min-height: 0;
	height: 100%;
	background: var(--ge-bg);
	border-right: 1px solid var(--ge-border-subtle);
	overflow: hidden;
}

.editor-sidebar__toolbox {
	flex-shrink: 0;
	min-height: 0;
	overflow: auto;
}

.editor-sidebar__props {
	flex: 1;
	min-height: 0;
	display: flex;
	flex-direction: column;
	overflow: hidden;
}

.editor-sidebar__resizer {
	flex-shrink: 0;
	touch-action: none;
}

.editor-sidebar__resizer--row {
	height: 5px;
	margin: 0;
	cursor: row-resize;
	background: var(--ge-border-subtle);
	transition: background 0.12s ease;
}

.editor-sidebar__resizer--row:hover,
.editor-sidebar__resizer--row:active {
	background: var(--ge-focus);
}

.editor-sidebar__resizer--col {
	position: absolute;
	top: 0;
	right: -3px;
	width: 6px;
	height: 100%;
	cursor: col-resize;
	z-index: 4;
	background: transparent;
}

.editor-sidebar__resizer--col::after {
	content: "";
	position: absolute;
	inset: 0;
	left: 2px;
	width: 2px;
	background: transparent;
	transition: background 0.12s ease;
}

.editor-sidebar__resizer--col:hover::after,
.editor-sidebar__resizer--col:active::after {
	background: var(--ge-focus);
}
</style>
