/**
 * Журнал сообщений редактора: единая лента всех передач на серверы и от серверов.
 * Реактивный модуль (без Pinia), чтобы вызываться как из Vue-компонентов,
 * так и из обычных функций REST-клиентов (domain-scheme-api, static-calculation-api и т.д.).
 */
import { reactive, readonly } from "vue";

export type MessageLogKind =
	| "request"
	| "response"
	| "error"
	| "info"
	| "success";

export interface MessageLogEntry {
	id: number;
	time: number;
	kind: MessageLogKind;
	text: string;
	detail?: string;
}

/** Ограничение размера ленты, чтобы не расти бесконечно. */
const MAX_ENTRIES = 300;

const entries = reactive<MessageLogEntry[]>([]);
let nextId = 1;

/** Реактивный список записей только для чтения (для панели). */
export const messageLog = readonly(entries);

function push(kind: MessageLogKind, text: string, detail?: string): void {
	entries.push({ id: nextId++, time: Date.now(), kind, text, detail });
	if (entries.length > MAX_ENTRIES) {
		entries.splice(0, entries.length - MAX_ENTRIES);
	}
}

/** Короткий путь без origin и без длинного query, для компактного отображения. */
function shortenUrl(url: string): string {
	let path = url;
	try {
		const u = new URL(url, "http://local");
		path = u.pathname + (u.search ? u.search : "");
	} catch {
		/* оставляем как есть */
	}
	return path.length > 70 ? `${path.slice(0, 67)}…` : path;
}

export function logServerRequest(method: string, url: string): void {
	push("request", `→ ${method.toUpperCase()} ${shortenUrl(url)}`);
}

export function logServerResponse(
	method: string,
	url: string,
	status: number,
): void {
	const ok = status >= 200 && status < 400;
	push(
		ok ? "response" : "error",
		`← ${status} ${method.toUpperCase()} ${shortenUrl(url)}`,
	);
}

export function logServerError(
	method: string,
	url: string,
	message: string,
): void {
	push("error", `✕ ${method.toUpperCase()} ${shortenUrl(url)}`, message);
}

export function logInfo(text: string, detail?: string): void {
	push("info", text, detail);
}

export function logSuccess(text: string, detail?: string): void {
	push("success", text, detail);
}

export function logError(text: string, detail?: string): void {
	push("error", text, detail);
}

export function clearMessageLog(): void {
	entries.splice(0, entries.length);
}
