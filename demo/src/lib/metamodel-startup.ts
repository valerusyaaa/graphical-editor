import { ref } from "vue";
import {
	getToolboxPaletteItems,
	setMetamodelExportBundle,
	type MetamodelObjectType,
} from "../data/metamodel-db.stub";
import { fetchMetamodelExportFromRemote } from "./metamodel-remote-load";
import { parseMetamodelExport } from "./metamodel-parse";
import { logError, logSuccess, logInfo } from "./message-log";

/**
 * ВРЕМЕННАЯ ЗАГЛУШКА метамодели: базовые типы для палитры без обращения к API.
 * Привязка к редактору (editorFeature, graphObjectType, schemaClass) проставляется
 * парсером по коду через BINDINGS (PROVIDER, CONSUMER, PIPE-MAIN-001, VALVE).
 */
const STUB_METAMODEL_EXPORT = {
	branchName: "Локальная заглушка",
	objectTypes: [
		{
			id: "stub-provider",
			code: "PROVIDER",
			name: "Поставщик",
			category: "source",
			is_abstract: true,
		},
		{
			id: "stub-consumer",
			code: "CONSUMER",
			name: "Потребитель",
			category: "sink",
			is_abstract: true,
		},
		{
			id: "stub-pipe",
			code: "PIPE-MAIN-001",
			name: "Участок трубопровода",
			category: "pipe",
			is_abstract: false,
		},
		{
			id: "stub-valve",
			code: "VALVE",
			name: "Кран",
			category: "valve",
			is_abstract: false,
		},
	],
	typeParameters: [],
	units: [],
};

/** Ветка main в API метамодели (Polina / pipeline-gas). */
export const METAMODEL_BRANCH_ID =
	"b7100fa2-3f36-4f34-aaaa-948a65356b94";

const DEFAULT_BRANCH_CONTENT_PATH = `/api/Branches/${METAMODEL_BRANCH_ID}/content`;

/** Подсказка в палитре после загрузки метамодели. */
export const metamodelRemoteHint = ref<string | null>(null);

/** Актуальный список типов палитры (обновляется после загрузки). */
export const metamodelPaletteItems = ref<MetamodelObjectType[]>(
	getToolboxPaletteItems(),
);

export function resolveMetamodelTypesUrl(): string {
	const envUrl = import.meta.env.VITE_METAMODEL_TYPES_URL?.trim();
	if (envUrl) return envUrl;
	const base = import.meta.env.BASE_URL.replace(/\/$/, "") || "";
	return `${base}/mm-proxy${DEFAULT_BRANCH_CONTENT_PATH}`;
}

/**
 * ВРЕМЕННО: при старте используется локальная заглушка метамодели.
 * Чтобы вернуть загрузку с API — замените тело на `await loadMetamodelFromRemote()`.
 * Вызывается из `App.vue`; палитра читает `metamodelPaletteItems` / `metamodelRemoteHint`.
 */
export async function loadMetamodelAtStartup(): Promise<void> {
	const bundle = parseMetamodelExport(STUB_METAMODEL_EXPORT);
	setMetamodelExportBundle(bundle);
	metamodelPaletteItems.value = getToolboxPaletteItems();
	metamodelRemoteHint.value = "Метамодель: локальная заглушка";
	logInfo("Метамодель: используется локальная заглушка.");
}

/** Загружает экспорт метамодели с API (вынесено для возможности возврата). */
export async function loadMetamodelFromRemote(): Promise<void> {
	const url = resolveMetamodelTypesUrl();
	try {
		const bundle = await fetchMetamodelExportFromRemote(url);
		if (bundle?.objectTypes.length) {
			setMetamodelExportBundle(bundle);
			metamodelPaletteItems.value = getToolboxPaletteItems();
			metamodelRemoteHint.value = bundle.branchName
				? `Метамодель: ${bundle.branchName}`
				: "Метамодель загружена с API";
			logSuccess(
				bundle.branchName
					? `Метамодель загружена с сервера: ${bundle.branchName}.`
					: "Метамодель загружена с сервера.",
			);
			return;
		}
		setMetamodelExportBundle(null);
		metamodelPaletteItems.value = getToolboxPaletteItems();
		metamodelRemoteHint.value =
			"Метамодель: ответ пустой или не распознан.";
		logInfo("Метамодель: ответ сервера пустой или не распознан.");
	} catch {
		setMetamodelExportBundle(null);
		metamodelPaletteItems.value = getToolboxPaletteItems();
		metamodelRemoteHint.value =
			"Метамодель: ошибка загрузки. Проверьте Tailscale, порт 5233 и прокси /mm-proxy.";
		logError(
			"Метамодель: ошибка загрузки с сервера",
			"Проверьте Tailscale, порт 5233 и прокси /mm-proxy.",
		);
	}
}
