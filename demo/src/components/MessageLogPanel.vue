<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import {
	clearMessageLog,
	messageLog,
	type MessageLogKind,
} from "../lib/message-log";

const collapsed = ref(false);
const listRef = ref<HTMLElement | null>(null);

const KIND_LABEL: Record<MessageLogKind, string> = {
	request: "Запрос",
	response: "Ответ",
	error: "Ошибка",
	info: "Инфо",
	success: "Успех",
};

const entries = computed(() => messageLog);

function formatTime(time: number): string {
	const d = new Date(time);
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function toggleCollapsed() {
	collapsed.value = !collapsed.value;
}

watch(
	() => messageLog.length,
	async () => {
		if (collapsed.value) return;
		await nextTick();
		const el = listRef.value;
		if (el) el.scrollTop = el.scrollHeight;
	},
);
</script>

<template>
	<aside class="msg-log" :class="{ 'msg-log--collapsed': collapsed }">
		<header class="msg-log__head">
			<span class="msg-log__title">Журнал сообщений</span>
			<span class="msg-log__count">{{ entries.length }}</span>
			<div class="msg-log__actions">
				<button
					type="button"
					class="msg-log__btn"
					title="Очистить журнал"
					:disabled="!entries.length"
					@click="clearMessageLog"
				>
					Очистить
				</button>
				<button
					type="button"
					class="msg-log__btn msg-log__btn--icon"
					:title="collapsed ? 'Развернуть' : 'Свернуть'"
					@click="toggleCollapsed"
				>
					{{ collapsed ? "▢" : "—" }}
				</button>
			</div>
		</header>

		<div v-if="!collapsed" ref="listRef" class="msg-log__list">
			<p v-if="!entries.length" class="msg-log__empty">
				Сообщений пока нет. Здесь будут отображаться все передачи
				на серверы и ответы от них.
			</p>
			<ul v-else class="msg-log__items">
				<li
					v-for="entry in entries"
					:key="entry.id"
					class="msg-log__item"
					:class="`msg-log__item--${entry.kind}`"
				>
					<span class="msg-log__time">{{ formatTime(entry.time) }}</span>
					<span class="msg-log__tag">{{ KIND_LABEL[entry.kind] }}</span>
					<span class="msg-log__text">
						{{ entry.text }}
						<span v-if="entry.detail" class="msg-log__detail">{{
							entry.detail
						}}</span>
					</span>
				</li>
			</ul>
		</div>
	</aside>
</template>

<style scoped>
.msg-log {
	width: 320px;
	max-width: 100%;
	max-height: 100%;
	display: flex;
	flex-direction: column;
	border: 1px solid var(--ge-border);
	border-radius: 8px;
	background: var(--ge-bg-elevated);
	color: var(--ge-text);
	box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
	font-size: 12px;
	overflow: hidden;
	pointer-events: auto;
}

.msg-log--collapsed {
	width: 220px;
}

.msg-log__head {
	flex-shrink: 0;
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 6px 8px;
	border-bottom: 1px solid var(--ge-border-subtle);
	background: var(--ge-bg-hover);
}

.msg-log__title {
	font-weight: 600;
	white-space: nowrap;
}

.msg-log__count {
	min-width: 18px;
	padding: 0 6px;
	border-radius: 999px;
	background: var(--ge-bg);
	color: var(--ge-text-muted);
	text-align: center;
	font-variant-numeric: tabular-nums;
}

.msg-log__actions {
	margin-left: auto;
	display: flex;
	gap: 4px;
}

.msg-log__btn {
	padding: 2px 8px;
	border: 1px solid var(--ge-border-subtle);
	border-radius: 5px;
	background: var(--ge-bg);
	color: var(--ge-text-muted);
	cursor: pointer;
	font-size: 11px;
	line-height: 1.5;
}

.msg-log__btn:hover:not(:disabled) {
	background: var(--ge-bg-hover);
	color: var(--ge-text);
}

.msg-log__btn:disabled {
	opacity: 0.5;
	cursor: default;
}

.msg-log__btn--icon {
	min-width: 26px;
	text-align: center;
}

.msg-log__list {
	flex: 1 1 auto;
	min-height: 0;
	overflow-y: auto;
	padding: 4px;
}

.msg-log__empty {
	margin: 0;
	padding: 12px 8px;
	color: var(--ge-text-dim);
	line-height: 1.5;
}

.msg-log__items {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.msg-log__item {
	display: grid;
	grid-template-columns: auto auto 1fr;
	gap: 6px;
	align-items: baseline;
	padding: 3px 6px;
	border-radius: 5px;
	border-left: 3px solid transparent;
	background: var(--ge-bg);
}

.msg-log__time {
	color: var(--ge-text-dim);
	font-variant-numeric: tabular-nums;
	white-space: nowrap;
}

.msg-log__tag {
	font-size: 10px;
	text-transform: uppercase;
	letter-spacing: 0.04em;
	color: var(--ge-text-muted);
	white-space: nowrap;
}

.msg-log__text {
	word-break: break-word;
	line-height: 1.45;
}

.msg-log__detail {
	display: block;
	margin-top: 2px;
	color: var(--ge-text-muted);
	white-space: pre-wrap;
}

.msg-log__item--request {
	border-left-color: #3b82f6;
}

.msg-log__item--response {
	border-left-color: #22c55e;
}

.msg-log__item--success {
	border-left-color: #22c55e;
}

.msg-log__item--success .msg-log__tag {
	color: #22c55e;
}

.msg-log__item--info {
	border-left-color: var(--ge-text-dim);
}

.msg-log__item--error {
	border-left-color: var(--ge-danger);
}

.msg-log__item--error .msg-log__tag,
.msg-log__item--error .msg-log__text {
	color: var(--ge-danger);
}
</style>
