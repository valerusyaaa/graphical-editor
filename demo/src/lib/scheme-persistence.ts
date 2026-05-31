import type {
	GraphicObjectDto,
	ObjectBaseData,
	ObjectDescription,
} from "../../../packages/core/src/api/types";
import type { EditorPayload } from "./editor-adapter";
import {
	deserializeBackendSchemeFromRaw,
	isBackendSchemeDocument,
} from "./backend-scheme-import";

const FILE_VERSION = 1;
const MIME = "application/x-graphical-editor-scheme+json";

export type SchemeFileV1 = {
	version: typeof FILE_VERSION;
	objects: GraphicObjectDto<ObjectBaseData>[];
	descriptions: ObjectDescription[];
	schemaProperties?: Record<string, unknown>;
};

function isObject(v: unknown): v is Record<string, unknown> {
	return typeof v === "object" && v !== null && !Array.isArray(v);
}

function validateObject(o: unknown): o is GraphicObjectDto<ObjectBaseData> {
	if (!isObject(o)) return false;
	if (typeof o.id !== "number") return false;
	if (o.graphObjectType !== "pointer" && o.graphObjectType !== "linear") {
		return false;
	}
	if (typeof o.featureObjectType !== "string") return false;
	if (o.graphObjectType === "pointer") {
		const p = o.position;
		if (!isObject(p) || typeof p.x !== "number" || typeof p.y !== "number") {
			return false;
		}
	}
	if (o.graphObjectType === "linear") {
		if (!Array.isArray(o.points) || o.points.length < 2) return false;
		for (const pt of o.points) {
			if (!isObject(pt) || typeof pt.x !== "number" || typeof pt.y !== "number") {
				return false;
			}
		}
	}
	return true;
}

function validateDescription(d: unknown): d is ObjectDescription {
	if (!isObject(d)) return false;
	return (
		typeof d.featureObjectType === "string" &&
		(d.graphObjectType === "pointer" || d.graphObjectType === "linear")
	);
}

/** Глубокая копия без structuredClone — тот не клонирует Vue-прокси из ref. */
function deepPlain<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}

/** Сериализация схемы для файла / буфера обмена между сеансами демо. */
export function serializeScheme(payload: EditorPayload): string {
	const body: SchemeFileV1 = {
		version: FILE_VERSION,
		objects: deepPlain(payload.objects),
		descriptions: deepPlain(payload.descriptions),
		...(payload.schemaProperties
			? { schemaProperties: deepPlain(payload.schemaProperties) }
			: {}),
	};
	return JSON.stringify(body, null, 2);
}

/**
 * Разбор JSON схемы. Если в файле нет `descriptions`, подставляются текущие из редактора.
 */
export function deserializeScheme(
	jsonText: string,
	fallbackDescriptions: ObjectDescription[],
): EditorPayload {
	let raw: unknown;
	try {
		raw = JSON.parse(jsonText) as unknown;
	} catch {
		throw new Error("Некорректный JSON");
	}
	if (!isObject(raw)) throw new Error("Ожидается объект в корне файла");

	if (isBackendSchemeDocument(raw)) {
		return deserializeBackendSchemeFromRaw(raw, fallbackDescriptions);
	}

	if (raw.version !== FILE_VERSION) {
		throw new Error(`Неподдерживаемая версия схемы: ${String(raw.version)}`);
	}
	if (!Array.isArray(raw.objects)) throw new Error("Поле objects должно быть массивом");
	for (const item of raw.objects) {
		if (!validateObject(item)) {
			throw new Error("Некорректный элемент в objects");
		}
	}
	let descriptions = fallbackDescriptions;
	if (Array.isArray(raw.descriptions) && raw.descriptions.length > 0) {
		if (!raw.descriptions.every(validateDescription)) {
			throw new Error("Некорректный элемент в descriptions");
		}
		descriptions = raw.descriptions as ObjectDescription[];
	}
	const schemaProperties = isObject(raw.schemaProperties)
		? (deepPlain(raw.schemaProperties) as Record<string, unknown>)
		: undefined;
	return {
		objects: deepPlain(raw.objects) as GraphicObjectDto<ObjectBaseData>[],
		descriptions: deepPlain(descriptions),
		schemaProperties,
	};
}

/** Имя файла при сохранении (скачивание в папку загрузок браузера). */
export const SCHEME_DOWNLOAD_FILENAME = "graphical-editor-scheme.json";

export function triggerDownload(filename: string, jsonText: string): void {
	const blob = new Blob([jsonText], {
		type: "application/json;charset=utf-8",
	});
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	a.rel = "noopener noreferrer";
	a.style.cssText = "position:fixed;left:-9999px;top:0;";
	document.body.appendChild(a);
	a.dispatchEvent(
		new MouseEvent("click", {
			bubbles: true,
			cancelable: true,
			view: window,
		}),
	);
	window.setTimeout(() => {
		a.remove();
		URL.revokeObjectURL(url);
	}, 2500);
}

/** `saved` — записано через диалог; `cancelled` — пользователь отменил; `need_download` — нет API, скачать через ссылку. */
export async function trySaveSchemeWithFilePicker(
	jsonText: string,
	suggestedName: string,
): Promise<"saved" | "cancelled" | "need_download"> {
	const w = window as Window &
		typeof globalThis & {
			showSaveFilePicker?: (options: {
				suggestedName?: string;
				types?: Array<{
					description: string;
					accept: Record<string, string[]>;
				}>;
			}) => Promise<FileSystemFileHandle>;
		};
	if (typeof w.showSaveFilePicker !== "function") return "need_download";
	try {
		const handle = await w.showSaveFilePicker({
			suggestedName,
			types: [
				{
					description: "Схема JSON",
					accept: { "application/json": [".json"] },
				},
			],
		});
		const writable = await handle.createWritable();
		await writable.write(new Blob([jsonText], { type: "application/json" }));
		await writable.close();
		return "saved";
	} catch (e) {
		if (e instanceof DOMException && e.name === "AbortError") return "cancelled";
		throw e;
	}
}

export { MIME as SCHEME_EXPORT_MIME };
