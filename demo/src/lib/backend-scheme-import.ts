import type {
	GraphicObjectDto,
	ObjectBaseData,
	ObjectDescription,
} from "../../../packages/core/src/api/types";
import type { EditorPayload } from "./editor-adapter";
import {
	CANONICAL_FEATURE,
	isPipeFeature,
} from "../../../packages/core/src/model/schema/feature-type-aliases";
import { setMonitorResultSlots } from "../../../packages/core/src/lib/monitor-object";
import { BACKEND_OBJECT_CLASS } from "./backend-scheme-export";
import { getMetamodelObjectTypeByCode } from "../data/metamodel-db.stub";
import { getDefaultPropertiesForBackendClass } from "./backend-property-templates";
import { collectConnectedEditorObjectIds } from "./backend-scheme-topology";

type AnyRec = Record<string, unknown>;

type BackendLine = {
	pipeID?: unknown;
	startID?: unknown;
	startJunction?: unknown;
	endID?: unknown;
	endJunction?: unknown;
	points?: Array<{ x?: unknown; y?: unknown }>;
};

/** Класс объекта бэкенда (EditedJSON) → `featureObjectType` редактора. */
const BACKEND_CLASS_TO_FEATURE: Record<string, string> = {
	[BACKEND_OBJECT_CLASS.Producer]: CANONICAL_FEATURE.Producer,
	Producer: CANONICAL_FEATURE.Producer,
	PROVIDER: CANONICAL_FEATURE.Producer,
	Supplier: CANONICAL_FEATURE.Producer,
	In: CANONICAL_FEATURE.Producer,
	supplier: CANONICAL_FEATURE.Producer,
	[BACKEND_OBJECT_CLASS.Consumer]: CANONICAL_FEATURE.Consumer,
	Consumer: CANONICAL_FEATURE.Consumer,
	CONSUMER: CANONICAL_FEATURE.Consumer,
	Out: CANONICAL_FEATURE.Consumer,
	[BACKEND_OBJECT_CLASS.Pipe]: CANONICAL_FEATURE.Pipe,
	Pipe: CANONICAL_FEATURE.Pipe,
	"PIPE-MAIN-001": CANONICAL_FEATURE.Pipe,
	[BACKEND_OBJECT_CLASS.Valve]: CANONICAL_FEATURE.Valve,
	Valve: CANONICAL_FEATURE.Valve,
	VALVE: CANONICAL_FEATURE.Valve,
	GateValve: CANONICAL_FEATURE.Valve,
	gate_valve: CANONICAL_FEATURE.Valve,
};

export type BackendSchemeEnvelope = {
	configVersion?: number;
	currentZoom?: number;
	references?: Array<{ class: string; id: number; title: string }>;
	result?: string;
	workingSet?: string;
};

function resolveImportedProperties(
	backendClass: string,
	raw: unknown,
): Record<string, unknown> | undefined {
	if (isObject(raw) && Object.keys(raw).length > 0) {
		return deepClone(raw as AnyRec);
	}
	const fallback = getDefaultPropertiesForBackendClass(backendClass);
	return Object.keys(fallback).length ? fallback : undefined;
}

function isObject(v: unknown): v is AnyRec {
	return typeof v === "object" && v !== null && !Array.isArray(v);
}

function asNumber(v: unknown): number | null {
	if (typeof v === "number" && Number.isFinite(v)) return v;
	if (typeof v === "string" && v.trim() !== "") {
		const n = Number(v);
		return Number.isFinite(n) ? n : null;
	}
	return null;
}

function asJunction(v: unknown): number {
	const n = asNumber(v);
	return n != null ? n : 0;
}

function metaId(code: string): string | undefined {
	return getMetamodelObjectTypeByCode(code)?.id;
}

function deepPlain<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}

function deepClone<T>(value: T): T {
	return deepPlain(value);
}

function parseBackendEnvelope(raw: AnyRec): BackendSchemeEnvelope | undefined {
	const envelope: BackendSchemeEnvelope = {};
	const configVersion = asNumber(raw.configVersion);
	if (configVersion != null) envelope.configVersion = configVersion;
	const currentZoom = asNumber(raw.currentZoom);
	if (currentZoom != null) envelope.currentZoom = currentZoom;
	if (typeof raw.result === "string") envelope.result = raw.result;
	if (typeof raw.workingSet === "string") envelope.workingSet = raw.workingSet;
	if (Array.isArray(raw.references)) {
		envelope.references = raw.references
			.filter(isObject)
			.map((r) => ({
				class: String(r.class ?? ""),
				id: asNumber(r.id) ?? 0,
				title: String(r.title ?? ""),
			}))
			.filter((r) => r.class && r.id > 0);
	}
	return Object.keys(envelope).length > 0 ? envelope : undefined;
}

/** JSON сохранённый «для бэкенда» (SimplePipe): `configVersion`, `objects[].class`, `lines`. */
export function isBackendSchemeDocument(raw: unknown): boolean {
	if (!isObject(raw)) return false;
	if (raw.version === 1) return false;
	if (!Array.isArray(raw.objects)) return false;
	if (typeof raw.configVersion === "number") return true;
	return raw.objects.some(
		(o) =>
			isObject(o) &&
			typeof o.class === "string" &&
			!("graphObjectType" in o),
	);
}

function parseBackendLines(raw: unknown): BackendLine[] {
	if (!Array.isArray(raw)) return [];
	return raw.filter((l): l is BackendLine => isObject(l));
}

function linePoints(line: BackendLine): { x: number; y: number }[] | null {
	const pts = line.points;
	if (!Array.isArray(pts) || pts.length < 2) return null;
	const out: { x: number; y: number }[] = [];
	for (const p of pts) {
		if (!isObject(p)) return null;
		const x = asNumber(p.x);
		const y = asNumber(p.y);
		if (x == null || y == null) return null;
		out.push({ x, y });
	}
	return out.length >= 2 ? out : null;
}

/**
 * Импорт схемы из JSON бэкенда (тот же формат, что при «Сохранить для бэкенда»).
 */
export function deserializeBackendSchemeFromRaw(
	raw: AnyRec,
	fallbackDescriptions: ObjectDescription[],
): EditorPayload {
	const backendObjects = (raw.objects as unknown[]).filter(isObject);
	const lines = parseBackendLines(raw.lines);
	const linesByPipeId = new Map<number, BackendLine[]>();

	for (const line of lines) {
		const pipeId = asNumber(line.pipeID);
		if (pipeId == null) continue;
		const list = linesByPipeId.get(pipeId) ?? [];
		list.push(line);
		linesByPipeId.set(pipeId, list);
	}

	const editorObjects: GraphicObjectDto<ObjectBaseData>[] = [];
	const extraBackendObjects: AnyRec[] = [];

	for (const o of backendObjects) {
		const cls = typeof o.class === "string" ? o.class : "";
		if (cls === "Schema" || !cls) continue;

		const id = asNumber(o.id);
		if (id == null || id === 0) continue;

		if (cls === "Monitor") {
			const x = asNumber(o.x);
			const y = asNumber(o.y);
			if (x == null || y == null) continue;
			const pointerProps = resolveImportedProperties(cls, o.properties);
			const rotation = asNumber(o.rotation);
			const sourceId = asNumber(o.sourceID) ?? 0;
			const resultSlots: string[] = [];
			for (let i = 1; i <= 10; i++) {
				resultSlots.push(String(o[`result.${i}`] ?? ""));
			}
			const data: ObjectBaseData = {
				techObjectId: id,
				objectTypeId: metaId("Monitor"),
				monitorSourceId: sourceId,
				...(pointerProps ? { backendProperties: pointerProps } : {}),
			};
			setMonitorResultSlots(data, resultSlots);
			editorObjects.push({
				id,
				featureObjectType: CANONICAL_FEATURE.Monitor,
				graphObjectType: "pointer",
				position: { x, y },
				...(rotation != null ? { rotateAngle: rotation } : {}),
				data,
			});
			continue;
		}

		const feature = BACKEND_CLASS_TO_FEATURE[cls];
		if (!feature) {
			extraBackendObjects.push(deepClone(o));
			continue;
		}

		if (isPipeFeature(feature)) {
			const pipeLines = linesByPipeId.get(id);
			const line = pipeLines?.[0];
			const points = line ? linePoints(line) : null;
			if (!points) continue;

			const startId = line ? asNumber(line.startID) : null;
			const endId = line ? asNumber(line.endID) : null;

			const pipeProps = resolveImportedProperties(cls, o.properties);
			editorObjects.push({
				id,
				featureObjectType: "pipe",
				graphObjectType: "linear",
				points,
				data: {
					techObjectId: id,
					objectTypeId: metaId("pipe"),
					...(pipeProps ? { backendProperties: pipeProps } : {}),
					...(startId != null && endId != null
						? {
								pipeTopology: {
									start: {
										objectId: startId,
										junction: asJunction(line!.startJunction),
									},
									end: {
										objectId: endId,
										junction: asJunction(line!.endJunction),
									},
								},
							}
						: {}),
				},
			});
			continue;
		}

		const x = asNumber(o.x);
		const y = asNumber(o.y);
		if (x == null || y == null) continue;

		const pointerProps = resolveImportedProperties(cls, o.properties);
		const rotation = asNumber(o.rotation);
		editorObjects.push({
			id,
			featureObjectType: feature,
			graphObjectType: "pointer",
			position: { x, y },
			...(rotation != null ? { rotateAngle: rotation } : {}),
			data: {
				techObjectId: id,
				objectTypeId: metaId(feature),
				...(pointerProps ? { backendProperties: pointerProps } : {}),
			},
		});
	}

	if (editorObjects.length === 0) {
		throw new Error("В файле нет объектов для редактора (Producer, Consumer, Pipe, GateValve)");
	}

	const connectedIds = collectConnectedEditorObjectIds(
		editorObjects,
		lines as unknown as AnyRec[],
	);
	if (connectedIds.size > 0) {
		const pruned = editorObjects.filter((dto) => {
			if (isPipeFeature(dto.featureObjectType)) {
				const techId = dto.data?.techObjectId ?? dto.id;
				return connectedIds.has(techId) || connectedIds.has(dto.id);
			}
			if (dto.graphObjectType === "pointer") {
				return connectedIds.has(dto.id);
			}
			return true;
		});
		if (pruned.length) editorObjects.length = 0, editorObjects.push(...pruned);
	}

	const schemaObj = backendObjects.find(
		(o) => typeof o.class === "string" && o.class === "Schema",
	);
	const schemaProperties =
		schemaObj && isObject(schemaObj.properties)
			? deepPlain(schemaObj.properties as AnyRec)
			: undefined;

	return {
		objects: deepPlain(editorObjects),
		descriptions: deepPlain(fallbackDescriptions),
		schemaProperties,
		extraBackendObjects: deepPlain(extraBackendObjects),
		backendEnvelope: parseBackendEnvelope(raw),
	};
}

export function deserializeBackendScheme(
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
	if (!isBackendSchemeDocument(raw)) {
		throw new Error("Файл не похож на схему бэкенда (SimplePipe)");
	}
	return deserializeBackendSchemeFromRaw(raw, fallbackDescriptions);
}
