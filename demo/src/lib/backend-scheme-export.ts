import type { GraphicObjectDto, ObjectBaseData } from "../../../packages/core/src/api/types";
import schemeReference from "../../public/scheme-reference.json";
import {
	isConsumerFeature,
	isMonitorFeature,
	isPipeFeature,
	isProducerFeature,
	isValveFeature,
} from "../../../packages/core/src/model/schema/feature-type-aliases";
import { getMonitorResultSlots } from "../../../packages/core/src/lib/monitor-object";
import {
	getConsumerInletWorld,
	getSupplierOutletWorld,
	getValvePortWorld,
	type XY,
} from "./pipe-anchors";
import type { BackendSchemeEnvelope } from "./backend-scheme-import";
import { filterObjectsForSchemeExport } from "./backend-scheme-topology";

type AnyRec = Record<string, unknown>;

export type BackendSchemeExportOptions = {
	/** Мониторы только в UI редактора; SimplePipe API не знает class Monitor. */
	omitMonitors?: boolean;
};

type LineEndpoint = { objectId: number; junction: number };

const INFER_PORT_MAX_PX = 40;

const REF = schemeReference as AnyRec;
const REF_OBJECTS = (REF.objects as AnyRec[]) ?? [];

/** Классы в JSON бэкенда (как в EditedJSON). */
export const BACKEND_OBJECT_CLASS = {
	Producer: "Producer",
	Consumer: "Consumer",
	Pipe: "Pipe",
	Valve: "Valve",
} as const;

const FEATURE_TO_CLASS: Record<string, string> = {
	Producer: BACKEND_OBJECT_CLASS.Producer,
	PROVIDER: BACKEND_OBJECT_CLASS.Producer,
	Consumer: BACKEND_OBJECT_CLASS.Consumer,
	CONSUMER: BACKEND_OBJECT_CLASS.Consumer,
	consumer: BACKEND_OBJECT_CLASS.Consumer,
	pipe: BACKEND_OBJECT_CLASS.Pipe,
	"PIPE-MAIN-001": BACKEND_OBJECT_CLASS.Pipe,
	Valve: BACKEND_OBJECT_CLASS.Valve,
	VALVE: BACKEND_OBJECT_CLASS.Valve,
	Monitor: "Monitor",
	supplier: BACKEND_OBJECT_CLASS.Producer,
	gate_valve: BACKEND_OBJECT_CLASS.Valve,
};

function buildMonitorBackendObject(
	dto: GraphicObjectDto<ObjectBaseData>,
	z: number,
): AnyRec {
	const o = pickReferenceObject("Monitor");
	o.id = dto.id;
	o.parentID = 0;
	const templateProps = (o.properties as AnyRec) ?? {};
	applyStoredProperties(
		o,
		dto.data?.backendProperties as Record<string, unknown> | undefined,
		templateProps,
	);
	const sourceId = dto.data?.monitorSourceId;
	if (sourceId != null) o.sourceID = sourceId;
	if (dto.position) {
		o.x = dto.position.x;
		o.y = dto.position.y;
	}
	o.z = z;
	if (dto.rotateAngle != null) o.rotation = dto.rotateAngle;
	const slots = getMonitorResultSlots(dto.data);
	for (let i = 0; i < 10; i++) {
		o[`result.${i + 1}`] = slots[i] ?? "";
		o[`property.${i + 1}`] = "";
	}
	return o;
}

function asObjectId(v: unknown): number | null {
	if (typeof v === "number" && Number.isFinite(v)) return v;
	if (typeof v === "string" && v.trim() !== "") {
		const n = Number(v);
		return Number.isFinite(n) ? n : null;
	}
	return null;
}

function deepClone<T>(v: T): T {
	return JSON.parse(JSON.stringify(v)) as T;
}

function pickReferenceObject(backendClass: string): AnyRec {
	const o = REF_OBJECTS.find((x) => x.class === backendClass);
	if (!o) {
		throw new Error(
			`В scheme-reference.json нет объекта class=${backendClass}`,
		);
	}
	return deepClone(o);
}

function isRecord(v: unknown): v is AnyRec {
	return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isValueLeaf(v: unknown): boolean {
	return (
		isRecord(v) &&
		"value" in v &&
		(typeof v.value === "string" || typeof v.value === "number")
	);
}

/** Подставляет значения из редактора в шаблон properties (структура как в response). */
function applyUserPropertyValues(
	template: AnyRec,
	user: AnyRec | undefined,
): void {
	if (!user) return;
	for (const [key, uv] of Object.entries(user)) {
		const tv = template[key];
		if (isValueLeaf(uv) && isValueLeaf(tv)) {
			tv.value = uv.value;
			continue;
		}
		if (isRecord(uv) && isRecord(tv) && !isValueLeaf(uv) && !isValueLeaf(tv)) {
			applyUserPropertyValues(tv, uv);
		}
	}
}

function applyStoredProperties(
	obj: AnyRec,
	stored: Record<string, unknown> | undefined,
	templateProps: AnyRec,
): void {
	const props = deepClone(templateProps);
	applyUserPropertyValues(props, stored as AnyRec | undefined);
	obj.properties = props;
}

function setRegistrationTitle(obj: AnyRec, title: string): void {
	const props = obj.properties as AnyRec | undefined;
	if (!props) return;
	const dr = props["Данные регистрации"] as AnyRec | undefined;
	if (!dr) return;
	const idBlock = dr.id as AnyRec | undefined;
	if (idBlock && typeof idBlock === "object") {
		idBlock.value = title;
	}
}

function collectPipePortCandidates(
	objects: GraphicObjectDto<ObjectBaseData>[],
): Array<LineEndpoint & XY> {
	const out: Array<LineEndpoint & XY> = [];
	for (const o of objects) {
		if (o.graphObjectType !== "pointer" || !o.position) continue;
		const pos = o.position;
		if (isProducerFeature(o.featureObjectType)) {
			const p = getSupplierOutletWorld(pos);
			out.push({ objectId: o.id, junction: 0, x: p.x, y: p.y });
		} else if (isConsumerFeature(o.featureObjectType)) {
			const p = getConsumerInletWorld(pos);
			out.push({ objectId: o.id, junction: 0, x: p.x, y: p.y });
		} else if (isValveFeature(o.featureObjectType)) {
			const left = getValvePortWorld(pos, 0);
			const right = getValvePortWorld(pos, 1);
			out.push({ objectId: o.id, junction: 0, x: left.x, y: left.y });
			out.push({ objectId: o.id, junction: 1, x: right.x, y: right.y });
		}
	}
	return out;
}

function nearestPort(
	world: XY,
	candidates: Array<LineEndpoint & XY>,
	maxPx: number,
): LineEndpoint | null {
	let best: LineEndpoint | null = null;
	let bestD = maxPx;
	for (const c of candidates) {
		const d = Math.hypot(c.x - world.x, c.y - world.y);
		if (d <= bestD) {
			bestD = d;
			best = { objectId: c.objectId, junction: c.junction };
		}
	}
	return best;
}

function pointerById(
	objects: GraphicObjectDto<ObjectBaseData>[],
	id: number,
): GraphicObjectDto<ObjectBaseData> | undefined {
	return objects.find((o) => o.id === id && o.graphObjectType === "pointer");
}

function isPipePortObject(o: GraphicObjectDto<ObjectBaseData>): boolean {
	return (
		isProducerFeature(o.featureObjectType) ||
		isConsumerFeature(o.featureObjectType) ||
		isValveFeature(o.featureObjectType)
	);
}

function resolvePipeLineEndpoints(
	dto: GraphicObjectDto<ObjectBaseData>,
	allObjects: GraphicObjectDto<ObjectBaseData>[],
): { start: LineEndpoint; end: LineEndpoint } | null {
	const pts = dto.points;
	if (!pts || pts.length < 2) return null;

	const topo = dto.data?.pipeTopology;
	let start: LineEndpoint | null = null;
	let end: LineEndpoint | null = null;

	if (topo?.start) {
		const id = asObjectId(topo.start.objectId);
		const ptr = id != null ? pointerById(allObjects, id) : undefined;
		if (ptr && isPipePortObject(ptr)) {
			start = {
				objectId: id!,
				junction:
					typeof topo.start.junction === "number" ? topo.start.junction : 0,
			};
		}
	}
	if (topo?.end) {
		const id = asObjectId(topo.end.objectId);
		const ptr = id != null ? pointerById(allObjects, id) : undefined;
		if (ptr && isPipePortObject(ptr)) {
			end = {
				objectId: id!,
				junction:
					typeof topo.end.junction === "number" ? topo.end.junction : 0,
			};
		}
	}

	const candidates = collectPipePortCandidates(allObjects);
	if (!start) {
		const n = nearestPort({ x: pts[0].x, y: pts[0].y }, candidates, INFER_PORT_MAX_PX);
		if (n) start = n;
	}
	if (!end) {
		const n = nearestPort({ x: pts[1].x, y: pts[1].y }, candidates, INFER_PORT_MAX_PX);
		if (n) end = n;
	}

	if (!start || !end) return null;
	if (
		start.objectId === end.objectId &&
		start.junction === end.junction
	) {
		return null;
	}
	return { start, end };
}

function buildEditorObject(
	dto: GraphicObjectDto<ObjectBaseData>,
	backendClass: string,
	z: number,
	title: string,
	objectId: number,
): AnyRec {
	const o = pickReferenceObject(backendClass);
	o.id = objectId;
	o.parentID = 0;
	applyStoredProperties(
		o,
		dto.data?.backendProperties as Record<string, unknown> | undefined,
		(o.properties as AnyRec) ?? {},
	);
	setRegistrationTitle(o, title);

	if (dto.graphObjectType === "pointer" && dto.position) {
		o.x = dto.position.x;
		o.y = dto.position.y;
		o.z = z;
		if (dto.rotateAngle != null && dto.rotateAngle !== 0) {
			o.rotation = dto.rotateAngle;
		}
	} else if (dto.graphObjectType === "linear") {
		o.x = 0;
		o.y = 0;
		o.z = z;
	}

	return o;
}

/**
 * Экспорт в формате EditedJSON (шаблон scheme-reference.json).
 */
export function serializeBackendScheme(
	objects: GraphicObjectDto<ObjectBaseData>[],
	schemaProperties?: Record<string, unknown>,
	_extraBackendObjects?: Record<string, unknown>[],
	envelope?: BackendSchemeEnvelope,
	options?: BackendSchemeExportOptions,
): string {
	const omitMonitors = options?.omitMonitors === true;
	const schema = pickReferenceObject("Schema");
	schema.id = 0;
	schema.parentID = 0;
	applyStoredProperties(
		schema,
		schemaProperties,
		(schema.properties as AnyRec) ?? {},
	);

	const outObjects: AnyRec[] = [schema];
	const references: { class: string; id: number; title: string }[] = [];
	const lines: AnyRec[] = [];
	let nextLineId = 1;

	const sortedAll = [...objects].sort((a, b) => a.id - b.id);

	for (const dto of sortedAll) {
		if (
			dto.graphObjectType !== "linear" ||
			!isPipeFeature(dto.featureObjectType)
		) {
			continue;
		}
		const techId = dto.data?.techObjectId ?? dto.id;
		const pts = dto.points ?? [];
		const resolved = resolvePipeLineEndpoints(dto, sortedAll);
		if (resolved && pts.length >= 2) {
			const lineId = nextLineId++;
			lines.push({
				endID: resolved.end.objectId,
				endJunction: resolved.end.junction,
				id: lineId,
				pipeID: techId,
				points: [
					{ x: Math.round(pts[0].x), y: Math.round(pts[0].y) },
					{ x: Math.round(pts[1].x), y: Math.round(pts[1].y) },
				],
				startID: resolved.start.objectId,
				startJunction: resolved.start.junction,
			});
		}
	}

	const sorted = filterObjectsForSchemeExport(sortedAll, lines);
	let zBase = 0.1;

	for (const dto of sorted) {
		zBase += 0.05;
		const backendClass = FEATURE_TO_CLASS[dto.featureObjectType];
		if (!backendClass) continue;

		if (isMonitorFeature(dto.featureObjectType)) {
			outObjects.push(buildMonitorBackendObject(dto, zBase));
			continue;
		}

		if (dto.graphObjectType === "pointer") {
			const title = isProducerFeature(dto.featureObjectType)
				? `Поставщик ${dto.id}`
				: isConsumerFeature(dto.featureObjectType)
					? `Потребитель ${dto.id}`
					: `Кран ${dto.id}`;
			const o = buildEditorObject(
				dto,
				backendClass,
				zBase,
				title,
				dto.id,
			);
			outObjects.push(o);
			references.push({
				class: backendClass,
				id: dto.id,
				title,
			});
		} else if (
			dto.graphObjectType === "linear" &&
			isPipeFeature(dto.featureObjectType)
		) {
			const techId = dto.data?.techObjectId ?? dto.id;
			const o = buildEditorObject(
				dto,
				BACKEND_OBJECT_CLASS.Pipe,
				zBase,
				`Труба ${techId}`,
				techId,
			);
			outObjects.push(o);
			references.push({
				class: BACKEND_OBJECT_CLASS.Pipe,
				id: techId,
				title: `Труба ${techId}`,
			});
		}
	}

	const exportedIds = new Set(outObjects.map((o) => Number(o.id) || 0));
	const linesExported = lines.filter((line) =>
		exportedIds.has(Number(line.pipeID) || 0),
	);

	const allIds = outObjects.map((o) => Number(o.id) || 0);
	const maxObjectID = allIds.length ? Math.max(...allIds) : 0;
	const maxLineID = linesExported.length
		? Math.max(...linesExported.map((l) => Number(l.id) || 0))
		: 0;

	const root: AnyRec = {
		configVersion:
			envelope?.configVersion ?? REF.configVersion ?? 1701,
		currentZoom: envelope?.currentZoom ?? REF.currentZoom ?? 6,
		maxLineID,
		maxObjectID,
		lines: linesExported,
		objects: outObjects,
		references: references.filter((r) =>
			outObjects.some((o) => Number(o.id) === r.id),
		),
		result: envelope?.result ?? REF.result ?? "ok",
		workingSet: envelope?.workingSet ?? REF.workingSet ?? "std",
	};

	return JSON.stringify(root, null, 4);
}

export function buildBackendSchemePayload(
	objects: GraphicObjectDto<ObjectBaseData>[],
	schemaProperties?: Record<string, unknown>,
	extraBackendObjects?: Record<string, unknown>[],
	envelope?: BackendSchemeEnvelope,
	options?: BackendSchemeExportOptions,
): AnyRec {
	return JSON.parse(
		serializeBackendScheme(
			objects,
			schemaProperties,
			extraBackendObjects,
			envelope,
			options,
		),
	) as AnyRec;
}

export const BACKEND_SCHEME_DOWNLOAD_FILENAME = "schema-backend.json";
