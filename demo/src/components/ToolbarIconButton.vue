<script setup lang="ts">
defineProps<{
	/** Текст подсказки при наведении */
	label: string;
	iconSrc: string;
	disabled?: boolean;
}>();

const emit = defineEmits<{
	click: [];
}>();
</script>

<template>
	<button
		type="button"
		class="toolbar-icon-btn"
		:disabled="disabled"
		:aria-label="label"
		@click="emit('click')"
	>
		<img :src="iconSrc" alt="" class="toolbar-icon-btn__img" />
		<span class="toolbar-icon-btn__tip" role="tooltip">{{ label }}</span>
	</button>
</template>

<style scoped>
.toolbar-icon-btn {
	position: relative;
	width: 38px;
	height: 38px;
	padding: 7px;
	cursor: pointer;
	border: 1px solid transparent;
	border-radius: 8px;
	background: transparent;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	transition:
		background 0.12s ease,
		border-color 0.12s ease,
		transform 0.08s ease;
}

.toolbar-icon-btn:hover:not(:disabled) {
	background: color-mix(in srgb, var(--ge-bg-hover, #2a2d2e) 55%, transparent);
	border-color: color-mix(in srgb, var(--ge-border, #454545) 45%, transparent);
}

.toolbar-icon-btn:active:not(:disabled) {
	transform: translateY(1px);
}

.toolbar-icon-btn:disabled {
	opacity: 0.55;
	cursor: not-allowed;
}

.toolbar-icon-btn__img {
	width: 20px;
	height: 20px;
	object-fit: contain;
	display: block;
	pointer-events: none;
	filter: var(--ge-toolbar-icon-filter, invert(1) brightness(1.12));
	opacity: 0.95;
}

.toolbar-icon-btn__tip {
	position: absolute;
	left: 50%;
	top: calc(100% + 7px);
	transform: translateX(-50%);
	padding: 5px 10px;
	border-radius: 6px;
	font-size: 11px;
	line-height: 1.3;
	white-space: nowrap;
	background: var(--ge-tooltip-bg, #2d2d2d);
	color: var(--ge-tooltip-text, #f5f5f5);
	border: 1px solid var(--ge-border, #525252);
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
	pointer-events: none;
	opacity: 0;
	visibility: hidden;
	transition:
		opacity 0.12s ease,
		visibility 0.12s ease;
	z-index: 40;
}

.toolbar-icon-btn:hover:not(:disabled) .toolbar-icon-btn__tip,
.toolbar-icon-btn:focus-visible .toolbar-icon-btn__tip {
	opacity: 1;
	visibility: visible;
}

.toolbar-icon-btn:focus-visible {
	outline: 2px solid color-mix(in srgb, var(--ge-focus, #737373) 80%, transparent);
	outline-offset: 2px;
}
</style>
