import type { MetamodelObjectType } from "../data/metamodel-db.stub";
import {
	parseMetamodelExport,
	type MetamodelExportBundle,
} from "./metamodel-parse";
import {
	logServerError,
	logServerRequest,
	logServerResponse,
} from "./message-log";

/**
 * GET JSON экспорта метамодели (`metamodel_main.json`).
 * Поддерживается полный экспорт: objectTypes, typeParameters, units.
 */
async function readMetamodelResponseBody(res: Response): Promise<unknown> {
	const text = await res.text();
	if (!text.trim()) return null;
	try {
		return JSON.parse(text) as unknown;
	} catch {
		return null;
	}
}

export async function fetchMetamodelExportFromRemote(
	url: string,
): Promise<MetamodelExportBundle | null> {
	logServerRequest("GET", url);
	let res: Response;
	try {
		res = await fetch(url, {
			credentials: "omit",
			headers: { accept: "text/plain, application/json" },
		});
	} catch (e) {
		logServerError("GET", url, e instanceof Error ? e.message : String(e));
		throw e;
	}
	logServerResponse("GET", url, res.status);
	if (!res.ok) return null;
	const body = await readMetamodelResponseBody(res);
	if (body == null) return null;
	return parseMetamodelExport(body);
}

/** @deprecated Используйте `fetchMetamodelExportFromRemote`. */
export async function fetchMetamodelTypesFromRemote(
	url: string,
): Promise<MetamodelObjectType[] | null> {
	const bundle = await fetchMetamodelExportFromRemote(url);
	return bundle?.objectTypes ?? null;
}
