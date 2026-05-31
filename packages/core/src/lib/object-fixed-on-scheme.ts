import type { ObjectBaseData } from "../api/types";

/** Путь к свойству «Фиксировать на схеме» в backendProperties. */
export const FIXED_ON_SCHEME_PATH = ["Design", "Фиксировать на схеме"] as const;

function isRecord(v: unknown): v is Record<string, unknown> {
	return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function getFixedOnSchemeValue(
	properties: Record<string, unknown> | undefined,
): string {
	if (!properties) return "False";
	let cur: unknown = properties;
	for (const seg of FIXED_ON_SCHEME_PATH) {
		if (!isRecord(cur)) return "False";
		cur = cur[seg];
	}
	if (isRecord(cur) && "value" in cur) {
		return String(cur.value ?? "False");
	}
	return "False";
}

export function isObjectFixedOnScheme(
	properties: Record<string, unknown> | undefined,
): boolean {
	return getFixedOnSchemeValue(properties) === "True";
}

export function setFixedOnSchemeInProperties(
	properties: Record<string, unknown>,
	fixed: boolean,
): void {
	let cur: Record<string, unknown> = properties;
	for (let i = 0; i < FIXED_ON_SCHEME_PATH.length - 1; i++) {
		const seg = FIXED_ON_SCHEME_PATH[i]!;
		const next = cur[seg];
		if (!isRecord(next)) {
			cur[seg] = {};
		}
		cur = cur[seg] as Record<string, unknown>;
	}
	const leaf = FIXED_ON_SCHEME_PATH[FIXED_ON_SCHEME_PATH.length - 1]!;
	const existing = cur[leaf];
	if (isRecord(existing) && "value" in existing) {
		cur[leaf] = { ...existing, value: fixed ? "True" : "False" };
	} else {
		cur[leaf] = { value: fixed ? "True" : "False" };
	}
}

export function readBackendProperties(
	data: ObjectBaseData | undefined,
): Record<string, unknown> | undefined {
	if (!data || typeof data !== "object") return undefined;
	const bp = (data as { backendProperties?: unknown }).backendProperties;
	return isRecord(bp) ? bp : undefined;
}
