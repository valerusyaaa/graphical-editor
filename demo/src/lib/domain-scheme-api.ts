/**
 * REST-клиент сервиса предметной области (`/api/schemes`).
 * POST — создание; GET — список, по id и по имени.
 * URL и поле `Data` (SchemeRequestDto) настраиваются через Vite env (см. demo/.env.example).
 */

import type { ObjectDescription } from "../../../packages/core/src/api/types";
import type { EditorPayload } from "./editor-adapter";
import { deserializeScheme } from "./scheme-persistence";
import {
	logServerError,
	logServerRequest,
	logServerResponse,
} from "./message-log";

const DEFAULT_COLLECTION_URL = "/domain-proxy/api/schemes";
/** Имя поля JSON с EditedJSON — `SchemeRequestDto.Data` на бэкенде. */
const DEFAULT_SCHEMA_FIELD = "Data";
const DEFAULT_DESCRIPTION = "Сохранена из графического редактора";

export type DomainSchemeSummary = {
	id: string | number;
	name: string;
	description?: string;
};

export type PostDomainSchemeResult = {
	id?: string | number;
	status: number;
	body: unknown;
};

export class DomainSchemeApiError extends Error {
	constructor(
		message: string,
		readonly status?: number,
		readonly body?: unknown,
	) {
		super(message);
		this.name = "DomainSchemeApiError";
	}
}

function isObject(v: unknown): v is Record<string, unknown> {
	return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** `/api/scheme` → `/api/schemes` (старые .env и fallback-кандидаты). */
function normalizeSchemesApiPath(path: string): string {
	let p = path.trim().replace(/\/$/, "");
	if (p.endsWith("/api/scheme")) {
		p = `${p}s`;
	}
	return p.replace(/\/api\/scheme\//gi, "/api/schemes/");
}

function schemeCollectionUrl(): string {
	const fromEnv = import.meta.env.VITE_DOMAIN_SCHEME_API_URL?.trim();
	if (fromEnv) return normalizeSchemesApiPath(fromEnv);
	const create = import.meta.env.VITE_DOMAIN_SCHEME_CREATE_URL?.trim();
	if (create) return normalizeSchemesApiPath(create);
	return DEFAULT_COLLECTION_URL;
}

export function schemeCreateUrl(): string {
	return schemeCollectionUrl();
}

function schemeListUrl(): string {
	const fromEnv = import.meta.env.VITE_DOMAIN_SCHEME_LIST_URL?.trim();
	return fromEnv
		? normalizeSchemesApiPath(fromEnv)
		: schemeCollectionUrl();
}

function schemeByIdUrl(schemeId: string | number): string {
	const encoded = encodeURIComponent(String(schemeId));
	const template =
		import.meta.env.VITE_DOMAIN_SCHEME_GET_BY_ID_URL?.trim() ||
		`${schemeCollectionUrl()}/{schemeId}`;
	const path = normalizeSchemesApiPath(template);
	return path
		.replace(/\{schemeId\}/gi, encoded)
		.replace(/\{id\}/gi, encoded);
}

function schemeByNameUrlCandidates(name: string): string[] {
	const encoded = encodeURIComponent(name);
	const custom = import.meta.env.VITE_DOMAIN_SCHEME_GET_BY_NAME_URL?.trim();
	const base = schemeCollectionUrl();
	const urls: string[] = [];
	if (custom) {
		urls.push(
			normalizeSchemesApiPath(custom).replace("{name}", encoded),
		);
	}
	urls.push(`${base}/by-name/${encoded}`);
	return [...new Set(urls)];
}

function schemeSchemaField(): string {
	const fromEnv = import.meta.env.VITE_DOMAIN_SCHEME_SCHEMA_KEY?.trim();
	return fromEnv || DEFAULT_SCHEMA_FIELD;
}

function schemeDescription(): string {
	const fromEnv = import.meta.env.VITE_DOMAIN_SCHEME_DESCRIPTION?.trim();
	return fromEnv || DEFAULT_DESCRIPTION;
}

function schemeSchemaAsString(): boolean {
	const v = import.meta.env.VITE_DOMAIN_SCHEME_SCHEMA_AS_STRING?.trim();
	return v === "1" || v?.toLowerCase() === "true";
}

function buildRequestBody(
	name: string,
	schemePayload: unknown,
	description?: string,
): Record<string, unknown> {
	const schemaKey = schemeSchemaField();
	const schemaValue = schemeSchemaAsString()
		? JSON.stringify(schemePayload)
		: schemePayload;
	return {
		name: name.trim(),
		description: (description ?? schemeDescription()).trim(),
		[schemaKey]: schemaValue,
	};
}

export function defaultSchemeName(): string {
	const d = new Date();
	const pad = (n: number) => String(n).padStart(2, "0");
	return `Схема ${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function extractSchemeId(body: unknown): string | number | undefined {
	if (!isObject(body)) return undefined;
	const id = body.id ?? body.Id ?? body.schemeId ?? body.SchemeId;
	if (typeof id === "string" || typeof id === "number") return id;
	return undefined;
}

function extractSchemeName(body: unknown): string | undefined {
	if (!isObject(body)) return undefined;
	const name = body.name ?? body.Name;
	return typeof name === "string" && name.trim() ? name.trim() : undefined;
}

function extractSchemeDescription(body: unknown): string | undefined {
	if (!isObject(body)) return undefined;
	const d = body.description ?? body.Description;
	return typeof d === "string" ? d : undefined;
}

/** Одна строка для alert — без `[object Object]`. */
function formatErrorLeaf(item: unknown): string {
	if (item == null) return "";
	if (typeof item === "string") return item.trim();
	if (typeof item === "number" || typeof item === "boolean") return String(item);
	if (Array.isArray(item)) {
		return item.map(formatErrorLeaf).filter(Boolean).join("; ");
	}
	if (isObject(item)) {
		for (const key of [
			"message",
			"Message",
			"description",
			"Description",
			"detail",
			"Detail",
			"title",
			"Title",
			"error",
			"Error",
		]) {
			const v = item[key];
			if (typeof v === "string" && v.trim()) return v.trim();
		}
		try {
			return JSON.stringify(item, null, 2);
		} catch {
			return String(item);
		}
	}
	return String(item);
}

export function formatApiErrors(body: unknown): string {
	if (body == null) return "";
	if (typeof body === "string") return body.trim();
	if (Array.isArray(body)) {
		return body.map(formatErrorLeaf).filter(Boolean).join("\n");
	}
	if (isObject(body)) {
		const title = body.title ?? body.Title;
		const detail = body.detail ?? body.Detail;
		const lines: string[] = [];
		if (typeof title === "string" && title.trim()) lines.push(title.trim());
		if (typeof detail === "string" && detail.trim()) lines.push(detail.trim());

		const errors =
			body.errors ?? body.Errors ?? body.error ?? body.Error ?? body.validationErrors;
		if (Array.isArray(errors)) {
			lines.push(...errors.map(formatErrorLeaf).filter(Boolean));
		} else if (typeof errors === "string" && errors.trim()) {
			lines.push(errors.trim());
		} else if (errors && typeof errors === "object") {
			for (const [k, v] of Object.entries(errors as Record<string, unknown>)) {
				const part = formatErrorLeaf(v);
				lines.push(part ? `${k}: ${part}` : k);
			}
		}

		if (lines.length) return [...new Set(lines)].join("\n");

		try {
			return JSON.stringify(body, null, 2);
		} catch {
			return formatErrorLeaf(body);
		}
	}
	return formatErrorLeaf(body);
}

/** Текст для `window.alert` из любого исключения. */
export function formatErrorForAlert(error: unknown): string {
	if (error instanceof DomainSchemeApiError) {
		return error.message;
	}
	if (error instanceof Error && error.message.trim()) {
		return error.message;
	}
	const text = formatApiErrors(error);
	return text || "Неизвестная ошибка";
}

function connectionError(url: string): Error {
	return new Error(
		`Нет связи с сервисом схем (${url}). Запустите бэкенд и проверьте VITE_DOMAIN_SERVICE_PROXY_TARGET (demo/.env.local). Перезапустите pnpm dev после смены .env.`,
	);
}

function proxyOrHttpError(
	status: number,
	statusText: string,
	body: unknown,
	url: string,
): DomainSchemeApiError {
	const detail = formatApiErrors(body);
	const raw = typeof body === "string" ? body : detail;
	if (status >= 500 && /ETIMEDOUT|ECONNREFUSED|proxy error/i.test(raw)) {
		return new DomainSchemeApiError(
			`Сервис схем недоступен (прокси Vite). Убедитесь, что API запущен и VITE_DOMAIN_SERVICE_PROXY_TARGET верный. Детали: ${raw}`,
			status,
			body,
		);
	}
	return new DomainSchemeApiError(
		detail
			? `HTTP ${status}: ${detail}`
			: `HTTP ${status} ${statusText || ""}`.trim() || `Ошибка запроса ${url}`,
		status,
		body,
	);
}

async function parseResponseBody(res: Response): Promise<unknown> {
	const text = await res.text();
	if (!text) return null;
	try {
		return JSON.parse(text) as unknown;
	} catch {
		return text;
	}
}

async function domainRequest(
	url: string,
	init: RequestInit,
): Promise<{ status: number; body: unknown }> {
	const method = init.method ?? "GET";
	logServerRequest(method, url);
	let res: Response;
	try {
		res = await fetch(url, {
			...init,
			headers: {
				Accept: "application/json",
				...init.headers,
			},
			redirect: "manual",
		});
	} catch {
		const err = connectionError(url);
		logServerError(method, url, err.message);
		throw err;
	}

	if (res.status >= 300 && res.status < 400) {
		const location = res.headers.get("Location") ?? "";
		const err = new Error(
			`Сервер ответил редиректом HTTP ${res.status}${location ? ` → ${location}` : ""}. ` +
				"На ПК с API в Development отключите UseHttpsRedirection или настройте HTTPS-порт.",
		);
		logServerError(method, url, err.message);
		throw err;
	}

	const body = await parseResponseBody(res);

	if (import.meta.env.DEV) {
		console.debug("[domain-scheme-api]", method, url, res.status, body);
	}

	logServerResponse(method, url, res.status);

	if (!res.ok) {
		throw proxyOrHttpError(res.status, res.statusText, body, url);
	}

	return { status: res.status, body };
}

function unwrapSchemeDto(body: unknown): Record<string, unknown> | null {
	if (!body) return null;
	if (isObject(body)) {
		const nested =
			body.scheme ?? body.Scheme ?? body.data ?? body.Data ?? body.result ?? body.Result;
		if (isObject(nested)) return nested;
		if (extractSchemeId(body) != null || extractSchemeName(body)) return body;
	}
	return null;
}

function parseSchemeSummaries(body: unknown): DomainSchemeSummary[] {
	let items: unknown[] | null = null;
	if (Array.isArray(body)) {
		items = body;
	} else if (isObject(body)) {
		for (const key of [
			"schemes",
			"Schemes",
			"items",
			"Items",
			"data",
			"Data",
			"result",
			"Result",
		]) {
			const v = body[key];
			if (Array.isArray(v)) {
				items = v;
				break;
			}
		}
	}
	if (!items) return [];

	const out: DomainSchemeSummary[] = [];
	for (const item of items) {
		const dto = unwrapSchemeDto(item) ?? (isObject(item) ? item : null);
		if (!dto) continue;
		const id = extractSchemeId(dto);
		const name = extractSchemeName(dto);
		if (id == null || !name) continue;
		out.push({
			id,
			name,
			description: extractSchemeDescription(dto),
		});
	}
	return out;
}

/** JSON схемы (EditedJSON) из DTO ответа API. */
export function extractSchemaPayload(dto: unknown): unknown {
	const record = unwrapSchemeDto(dto) ?? (isObject(dto) ? dto : null);
	if (!record) {
		throw new Error("В ответе API нет данных схемы");
	}

	const schemaKey = schemeSchemaField();
	const candidates = [
		record[schemaKey],
		record.Data,
		record.data,
		record.dataJson,
		record.DataJson,
		record.schema,
		record.Schema,
		record.json,
		record.Json,
	];

	let raw: unknown;
	for (const c of candidates) {
		if (c != null && c !== "") {
			raw = c;
			break;
		}
	}

	if (raw == null) {
		if (isBackendSchemeShape(record)) return record;
		throw new Error(
			`В ответе API нет поля «${schemaKey}» (и нет узнаваемого EditedJSON)`,
		);
	}

	if (typeof raw === "string") {
		try {
			return JSON.parse(raw) as unknown;
		} catch {
			throw new Error(
				`Поле «${schemaKey}» в ответе API — некорректная JSON-строка`,
			);
		}
	}

	return raw;
}

function isBackendSchemeShape(v: unknown): boolean {
	return isObject(v) && Array.isArray(v.objects);
}

export function schemePayloadToJsonText(payload: unknown): string {
	if (typeof payload === "string") return payload;
	return JSON.stringify(payload);
}

/** Разбор JSON схемы из API в payload редактора. */
export function editorPayloadFromSchemeJson(
	schemeJson: unknown,
	fallbackDescriptions: ObjectDescription[],
): EditorPayload {
	return deserializeScheme(
		schemePayloadToJsonText(schemeJson),
		fallbackDescriptions,
	);
}

export async function listSchemesFromDomainService(): Promise<DomainSchemeSummary[]> {
	const { body } = await domainRequest(schemeListUrl(), { method: "GET" });
	const list = parseSchemeSummaries(body);
	if (list.length > 0) return list;

	const dto = unwrapSchemeDto(body);
	if (dto) {
		const id = extractSchemeId(dto);
		const name = extractSchemeName(dto);
		if (id != null && name) {
			return [{ id, name, description: extractSchemeDescription(dto) }];
		}
	}

	return [];
}

export async function getSchemeDtoFromDomainServiceById(
	id: string | number,
): Promise<unknown> {
	const { body } = await domainRequest(schemeByIdUrl(id), { method: "GET" });
	return body;
}

export async function getSchemePayloadFromDomainServiceById(
	id: string | number,
): Promise<unknown> {
	const body = await getSchemeDtoFromDomainServiceById(id);
	return extractSchemaPayload(body);
}

export async function getSchemePayloadFromDomainServiceByName(
	name: string,
): Promise<unknown> {
	const trimmed = name.trim();
	if (!trimmed) throw new Error("Укажите имя схемы");

	let last404: DomainSchemeApiError | null = null;
	for (const url of schemeByNameUrlCandidates(trimmed)) {
		try {
			const { body } = await domainRequest(url, { method: "GET" });
			return extractSchemaPayload(body);
		} catch (e) {
			if (e instanceof DomainSchemeApiError && e.status === 404) {
				last404 = e;
				continue;
			}
			throw e;
		}
	}

	const list = await listSchemesFromDomainService();
	const match = list.find(
		(s) =>
			s.name === trimmed ||
			s.name.localeCompare(trimmed, undefined, { sensitivity: "accent" }) ===
				0,
	);
	if (match) {
		return getSchemePayloadFromDomainServiceById(match.id);
	}

	if (last404) {
		throw new Error(`Схема «${trimmed}» не найдена (HTTP 404)`);
	}
	throw new Error(`Схема «${trimmed}» не найдена`);
}

export async function loadEditorPayloadFromDomainServiceById(
	id: string | number,
	fallbackDescriptions: ObjectDescription[],
): Promise<EditorPayload> {
	const payload = await getSchemePayloadFromDomainServiceById(id);
	return editorPayloadFromSchemeJson(payload, fallbackDescriptions);
}

export async function loadEditorPayloadFromDomainServiceByName(
	name: string,
	fallbackDescriptions: ObjectDescription[],
): Promise<EditorPayload> {
	const payload = await getSchemePayloadFromDomainServiceByName(name);
	return editorPayloadFromSchemeJson(payload, fallbackDescriptions);
}

/**
 * Создание схемы: тело `{ name, description, Data }` (`SchemeRequestDto` на бэкенде).
 */
function schemeRawPostUrl(): string {
	const fromEnv = import.meta.env.VITE_DOMAIN_SCHEME_RAW_URL?.trim();
	if (fromEnv) return fromEnv.replace(/\/$/, "");
	return "/domain-proxy/api/schemes/raw";
}

function schemeRawUpdateUrl(schemeId: string | number): string {
	const template =
		import.meta.env.VITE_DOMAIN_SCHEME_RAW_UPDATE_URL?.trim() ||
		"/domain-proxy/api/schemes/{schemeId}";
	return normalizeSchemesApiPath(template)
		.replace(/\{schemeId\}/gi, encodeURIComponent(String(schemeId)))
		.replace(/\{id\}/gi, encodeURIComponent(String(schemeId)));
}

/** POST EditedJSON как тело запроса (`/api/schemes/raw`). */
export async function postSchemeRawToDomainService(
	schemeJson: unknown,
): Promise<{ status: number; body: unknown }> {
	return domainRequest(schemeRawPostUrl(), {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(schemeJson),
	});
}

/** PUT обновление схемы тем же EditedJSON. */
export async function updateSchemeRawOnDomainService(
	schemeId: string | number,
	schemeJson: unknown,
): Promise<{ status: number; body: unknown }> {
	return domainRequest(schemeRawUpdateUrl(schemeId), {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(schemeJson),
	});
}

/** PUT `SchemeRequestDto` (`{ name, description, Data }`). */
export async function putSchemeToDomainService(
	schemeId: string | number,
	schemePayload: unknown,
	name: string,
	description?: string,
): Promise<{ status: number; body: unknown }> {
	return domainRequest(schemeRawUpdateUrl(schemeId), {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(buildRequestBody(name, schemePayload, description)),
	});
}

export async function postSchemeToDomainService(
	schemePayload: unknown,
	name: string,
	description?: string,
): Promise<PostDomainSchemeResult> {
	const url = schemeCreateUrl();
	const requestBody = buildRequestBody(name, schemePayload, description);

	const { status, body } = await domainRequest(url, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(requestBody),
	});

	return {
		id: extractSchemeId(body),
		status,
		body,
	};
}
