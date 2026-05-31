import type { GraphicObjectDto, ObjectBaseData } from "../../api/types";
import { applyRegistrationLabelToProperties } from "../../lib/registration-id";
import { isMonitorFeature } from "../schema/feature-type-aliases";
import type { XYPosition } from "../schema/types";

export type ClipboardBundle = {
	items: GraphicObjectDto<ObjectBaseData>[];
	/** Центроид выделения в момент копирования (привязка при вставке). */
	anchor: XYPosition;
};

export function deepCloneDto<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}

export function selectionAnchor(
	objects: GraphicObjectDto<ObjectBaseData>[],
	ids: number[],
): XYPosition {
	const idSet = new Set(ids);
	const pts: XYPosition[] = [];
	for (const o of objects) {
		if (!idSet.has(o.id)) continue;
		if (o.graphObjectType === "pointer" && o.position) {
			pts.push(o.position);
		} else if (o.graphObjectType === "linear" && o.points?.length) {
			pts.push(...o.points);
		}
	}
	if (!pts.length) return { x: 0, y: 0 };
	let sx = 0;
	let sy = 0;
	for (const p of pts) {
		sx += p.x;
		sy += p.y;
	}
	return { x: sx / pts.length, y: sy / pts.length };
}

/** Смещение копий группы; переназначение id и pipeTopology внутри группы. */
export function cloneItemsForPaste(
	items: GraphicObjectDto<ObjectBaseData>[],
	objs: GraphicObjectDto<ObjectBaseData>[],
	offset: XYPosition,
): GraphicObjectDto<ObjectBaseData>[] {
	let nextId =
		objs.reduce((m, o) => Math.max(m, o.id), 0) + 1;
	const idMap = new Map<number, number>();

	const clones = items.map((item) => {
		const copy = deepCloneDto(item);
		const oldId = copy.id;
		const newId = nextId++;
		idMap.set(oldId, newId);
		copy.id = newId;
		if (copy.data && typeof copy.data === "object") {
			copy.data = {
				...copy.data,
				techObjectId: newId,
			};
			const props = copy.data.backendProperties;
			if (
				props &&
				typeof props === "object" &&
				!isMonitorFeature(copy.featureObjectType)
			) {
				applyRegistrationLabelToProperties(
					props as Record<string, unknown>,
					copy.featureObjectType,
					newId,
				);
			}
		}
		return copy;
	});

	for (const copy of clones) {
		if (copy.graphObjectType === "pointer" && copy.position) {
			copy.position = {
				x: copy.position.x + offset.x,
				y: copy.position.y + offset.y,
			};
		} else if (copy.graphObjectType === "linear" && copy.points?.length) {
			copy.points = copy.points.map((p) => ({
				x: p.x + offset.x,
				y: p.y + offset.y,
			}));
		}
		const topo = copy.data?.pipeTopology;
		if (topo) {
			const start = topo.start;
			const end = topo.end;
			copy.data = {
				...copy.data!,
				pipeTopology: {
					start:
						start && idMap.has(start.objectId)
							? { ...start, objectId: idMap.get(start.objectId)! }
							: start,
					end:
						end && idMap.has(end.objectId)
							? { ...end, objectId: idMap.get(end.objectId)! }
							: end,
				},
			};
		}
	}

	return clones;
}
