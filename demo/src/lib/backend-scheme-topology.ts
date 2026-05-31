import type { GraphicObjectDto, ObjectBaseData } from "../../../packages/core/src/api/types";
import {
	isMonitorFeature,
	isPipeFeature,
} from "../../../packages/core/src/model/schema/feature-type-aliases";

type AnyRec = Record<string, unknown>;

function asId(v: unknown): number | null {
	const n = Number(v);
	return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Id объектов, участвующих в гидравлической топологии (линии + трубы + мониторы на них).
 * Объекты вне множества не экспортируются (например «потерянный» потребитель за пределами схемы).
 */
export function collectConnectedEditorObjectIds(
	objects: GraphicObjectDto<ObjectBaseData>[],
	lines: AnyRec[],
): Set<number> {
	const connected = new Set<number>();

	for (const line of lines) {
		for (const key of ["startID", "endID", "pipeID"] as const) {
			const id = asId(line[key]);
			if (id != null) connected.add(id);
		}
	}

	for (const dto of objects) {
		if (isPipeFeature(dto.featureObjectType)) {
			const techId = dto.data?.techObjectId ?? dto.id;
			if (connected.has(techId)) connected.add(dto.id);
		}
	}

	for (const dto of objects) {
		if (!isMonitorFeature(dto.featureObjectType)) continue;
		const src = dto.data?.monitorSourceId;
		if (src != null && connected.has(src)) connected.add(dto.id);
	}

	return connected;
}

/** Удаляет из редактора узлы, не связанные ни с одной линией (кроме Schema). */
export function pruneDisconnectedEditorObjects(
	objects: GraphicObjectDto<ObjectBaseData>[],
): {
	objects: GraphicObjectDto<ObjectBaseData>[];
	removedIds: number[];
} {
	const lines: AnyRec[] = [];
	for (const dto of objects) {
		if (!isPipeFeature(dto.featureObjectType)) continue;
		const techId = dto.data?.techObjectId ?? dto.id;
		const topo = dto.data?.pipeTopology;
		if (topo?.start && topo?.end) {
			lines.push({
				pipeID: techId,
				startID: topo.start.objectId,
				endID: topo.end.objectId,
			});
		}
	}
	const connected = collectConnectedEditorObjectIds(objects, lines);
	if (!connected.size) return { objects, removedIds: [] };

	const kept = objects.filter((dto) => {
		if (isPipeFeature(dto.featureObjectType)) {
			const techId = dto.data?.techObjectId ?? dto.id;
			return connected.has(techId) || connected.has(dto.id);
		}
		if (dto.graphObjectType === "pointer" || isMonitorFeature(dto.featureObjectType)) {
			return connected.has(dto.id);
		}
		return true;
	});
	const removedIds = objects
		.filter((o) => !kept.includes(o))
		.map((o) => o.id);
	return { objects: kept, removedIds };
}

export function filterObjectsForSchemeExport(
	objects: GraphicObjectDto<ObjectBaseData>[],
	lines: AnyRec[],
): GraphicObjectDto<ObjectBaseData>[] {
	const connected = collectConnectedEditorObjectIds(objects, lines);
	if (!connected.size) return [...objects];

	return objects.filter((dto) => {
		if (isPipeFeature(dto.featureObjectType)) {
			const techId = dto.data?.techObjectId ?? dto.id;
			return connected.has(techId) || connected.has(dto.id);
		}
		if (dto.graphObjectType === "pointer") {
			return connected.has(dto.id);
		}
		if (isMonitorFeature(dto.featureObjectType)) {
			return connected.has(dto.id);
		}
		return true;
	});
}
