<script setup lang="ts">
import { ref, watch } from "vue";
import type { ObjectDescription } from "../../../packages/core/src/api/types";
import type { EditorPayload } from "../lib/editor-adapter";
import {
	formatErrorForAlert,
	listSchemesFromDomainService,
	loadEditorPayloadFromDomainServiceById,
	loadEditorPayloadFromDomainServiceByName,
	type DomainSchemeSummary,
} from "../lib/domain-scheme-api";
import { logError } from "../lib/message-log";

const props = defineProps<{
	open: boolean;
	descriptions: ObjectDescription[];
}>();

export type SchemeLoadedMeta = {
	schemeId: string | number;
	name: string;
};

const emit = defineEmits<{
	"update:open": [value: boolean];
	loaded: [payload: EditorPayload, meta: SchemeLoadedMeta];
}>();

const schemes = ref<DomainSchemeSummary[]>([]);
const listLoading = ref(false);
const listError = ref<string | null>(null);
const nameQuery = ref("");
const actionLoading = ref(false);
const selectedId = ref<string | number | null>(null);

function close() {
	emit("update:open", false);
}

function stop(e: Event) {
	e.stopPropagation();
}

async function refreshList() {
	listLoading.value = true;
	listError.value = null;
	try {
		schemes.value = await listSchemesFromDomainService();
		if (
			selectedId.value != null &&
			!schemes.value.some((s) => s.id === selectedId.value)
		) {
			selectedId.value = null;
		}
	} catch (e) {
		listError.value =
			e instanceof Error ? e.message : "Не удалось получить список схем";
		schemes.value = [];
	} finally {
		listLoading.value = false;
	}
}

async function applyPayload(
	payload: EditorPayload,
	meta: SchemeLoadedMeta,
) {
	emit("loaded", payload, meta);
	close();
}

async function openSelected() {
	if (selectedId.value == null || actionLoading.value) return;
	actionLoading.value = true;
	try {
		const payload = await loadEditorPayloadFromDomainServiceById(
			selectedId.value,
			props.descriptions,
		);
		const row = schemes.value.find((s) => s.id === selectedId.value);
		await applyPayload(payload, {
			schemeId: selectedId.value,
			name: row?.name ?? String(selectedId.value),
		});
	} catch (e) {
		logError("Не удалось открыть схему с сервера", formatErrorForAlert(e));
	} finally {
		actionLoading.value = false;
	}
}

async function openByName() {
	const name = nameQuery.value.trim();
	if (!name || actionLoading.value) return;
	actionLoading.value = true;
	try {
		const payload = await loadEditorPayloadFromDomainServiceByName(
			name,
			props.descriptions,
		);
		let schemeId: string | number = name;
		const row = schemes.value.find(
			(s) =>
				s.name === name ||
				s.name.localeCompare(name, undefined, { sensitivity: "accent" }) ===
					0,
		);
		if (row) schemeId = row.id;
		await applyPayload(payload, { schemeId, name });
	} catch (e) {
		logError("Не удалось открыть схему по имени", formatErrorForAlert(e));
	} finally {
		actionLoading.value = false;
	}
}

function onRowDblClick(s: DomainSchemeSummary) {
	selectedId.value = s.id;
	void openSelected();
}

watch(
	() => props.open,
	(isOpen) => {
		if (isOpen) {
			selectedId.value = null;
			void refreshList();
		}
	},
);
</script>

<template>
	<Teleport to="body">
		<div
			v-if="open"
			class="scheme-api-backdrop"
			@mousedown="close"
		>
			<div
				class="scheme-api-dialog"
				role="dialog"
				aria-labelledby="scheme-api-title"
				@mousedown="stop"
			>
				<header class="scheme-api-header">
					<h2 id="scheme-api-title">Загрузить схему с API</h2>
					<button
						type="button"
						class="scheme-api-close"
						aria-label="Закрыть"
						@click="close"
					>
						×
					</button>
				</header>

				<div class="scheme-api-body">
					<section class="scheme-api-section">
						<div class="scheme-api-row">
							<label class="scheme-api-label" for="scheme-api-name">
								По имени
							</label>
							<input
								id="scheme-api-name"
								v-model="nameQuery"
								type="text"
								class="scheme-api-input"
								placeholder="Имя сохранённой схемы"
								:disabled="actionLoading"
								@keydown.enter.prevent="openByName"
							/>
							<button
								type="button"
								class="scheme-api-btn"
								:disabled="actionLoading || !nameQuery.trim()"
								@click="openByName"
							>
								Открыть
							</button>
						</div>
					</section>

					<section class="scheme-api-section">
						<div class="scheme-api-row scheme-api-row--between">
							<span class="scheme-api-label">Список схем</span>
							<button
								type="button"
								class="scheme-api-btn scheme-api-btn--ghost"
								:disabled="listLoading"
								@click="refreshList"
							>
								{{ listLoading ? "Загрузка…" : "Обновить" }}
							</button>
						</div>

						<p v-if="listError" class="scheme-api-error">{{ listError }}</p>
						<p
							v-else-if="!listLoading && schemes.length === 0"
							class="scheme-api-hint"
						>
							Схем на сервере нет или API не вернул список. Попробуйте загрузку
							по имени.
						</p>

						<ul
							v-else
							class="scheme-api-list"
							:aria-busy="listLoading"
						>
							<li
								v-for="s in schemes"
								:key="String(s.id)"
								class="scheme-api-item"
								:class="{ 'scheme-api-item--selected': selectedId === s.id }"
								@click="selectedId = s.id"
								@dblclick="onRowDblClick(s)"
							>
								<span class="scheme-api-item-name">{{ s.name }}</span>
								<span class="scheme-api-item-meta">id {{ s.id }}</span>
								<span
									v-if="s.description"
									class="scheme-api-item-desc"
								>{{ s.description }}</span>
							</li>
						</ul>
					</section>
				</div>

				<footer class="scheme-api-footer">
					<button
						type="button"
						class="scheme-api-btn scheme-api-btn--ghost"
						@click="close"
					>
						Отмена
					</button>
					<button
						type="button"
						class="scheme-api-btn scheme-api-btn--primary"
						:disabled="selectedId == null || actionLoading"
						@click="openSelected"
					>
						{{ actionLoading ? "Открытие…" : "Открыть выбранную" }}
					</button>
				</footer>
			</div>
		</div>
	</Teleport>
</template>

<style scoped>
.scheme-api-backdrop {
	position: fixed;
	inset: 0;
	z-index: 100001;
	background: rgba(15, 23, 42, 0.55);
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 1rem;
}

.scheme-api-dialog {
	width: min(32rem, 100%);
	max-height: min(85vh, 640px);
	display: flex;
	flex-direction: column;
	background: #f8fafc;
	border-radius: 0.75rem;
	box-shadow: 0 24px 48px rgba(15, 23, 42, 0.35);
	border: 1px solid #cbd5e1;
}

.scheme-api-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 1rem 1.25rem 0.5rem;
}

.scheme-api-header h2 {
	margin: 0;
	font-size: 1.125rem;
	font-weight: 600;
	color: #0f172a;
}

.scheme-api-close {
	border: none;
	background: transparent;
	font-size: 1.5rem;
	line-height: 1;
	cursor: pointer;
	color: #64748b;
	padding: 0 0.25rem;
}

.scheme-api-body {
	flex: 1;
	overflow: auto;
	padding: 0 1.25rem;
	display: flex;
	flex-direction: column;
	gap: 1.25rem;
}

.scheme-api-section {
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
}

.scheme-api-row {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 0.5rem;
}

.scheme-api-row--between {
	justify-content: space-between;
}

.scheme-api-label {
	font-size: 0.875rem;
	font-weight: 600;
	color: #334155;
}

.scheme-api-input {
	flex: 1;
	min-width: 10rem;
	padding: 0.4rem 0.6rem;
	border: 1px solid #94a3b8;
	border-radius: 0.375rem;
	font: inherit;
}

.scheme-api-list {
	list-style: none;
	margin: 0;
	padding: 0;
	max-height: 14rem;
	overflow: auto;
	border: 1px solid #e2e8f0;
	border-radius: 0.375rem;
	background: #fff;
}

.scheme-api-item {
	padding: 0.55rem 0.75rem;
	cursor: pointer;
	border-bottom: 1px solid #f1f5f9;
	display: flex;
	flex-direction: column;
	gap: 0.15rem;
}

.scheme-api-item:last-child {
	border-bottom: none;
}

.scheme-api-item:hover {
	background: #f1f5f9;
}

.scheme-api-item--selected {
	background: #dbeafe;
}

.scheme-api-item-name {
	font-weight: 500;
	color: #0f172a;
}

.scheme-api-item-meta {
	font-size: 0.75rem;
	color: #64748b;
}

.scheme-api-item-desc {
	font-size: 0.8125rem;
	color: #475569;
}

.scheme-api-error {
	margin: 0;
	font-size: 0.875rem;
	color: #b91c1c;
}

.scheme-api-hint {
	margin: 0;
	font-size: 0.875rem;
	color: #64748b;
}

.scheme-api-footer {
	display: flex;
	justify-content: flex-end;
	gap: 0.5rem;
	padding: 1rem 1.25rem;
	border-top: 1px solid #e2e8f0;
}

.scheme-api-btn {
	cursor: pointer;
	border: 1px solid #94a3b8;
	border-radius: 0.375rem;
	padding: 0.4rem 0.75rem;
	font: inherit;
	font-size: 0.875rem;
	background: #fff;
	color: #0f172a;
}

.scheme-api-btn:hover:not(:disabled) {
	background: #f1f5f9;
}

.scheme-api-btn:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.scheme-api-btn--ghost {
	background: transparent;
}

.scheme-api-btn--primary {
	background: #dbeafe;
	border-color: #3b82f6;
	color: #1e3a8a;
}

.scheme-api-btn--primary:hover:not(:disabled) {
	background: #bfdbfe;
}
</style>
