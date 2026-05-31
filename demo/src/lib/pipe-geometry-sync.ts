import type { GraphicObjectDto, ObjectBaseData } from "../../../packages/core/src/api/types";
import { isPipeFeature } from "../../../packages/core/src/model/schema/feature-type-aliases";
import { getPipePortWorldForPointer, type XY } from "./pipe-anchors";

function samePoint(a: XY, b: XY, eps = 0.5): boolean {
	return Math.abs(a.x - b.x) < eps && Math.abs(a.y - b.y) < eps;
}

/**
 * Обновляет координаты концов трубы с привязкой при перемещении узлов (поставщик, потребитель, кран).
 */
export function syncPipePointsToTopology(
	list: GraphicObjectDto<ObjectBaseData>[],
): GraphicObjectDto<ObjectBaseData>[] {
	let changed = false;
	const dtoOf = (id: number): GraphicObjectDto<ObjectBaseData> | undefined =>
		list.find((o) => o.id === id) as GraphicObjectDto<ObjectBaseData> | undefined;

	const out = list.map((o) => {
		if (o.graphObjectType !== "linear" || !isPipeFeature(o.featureObjectType)) {
			return o;
		}
		const pts = o.points;
		if (!pts || pts.length < 2) return o;
		const topo = o.data?.pipeTopology;
		if (!topo?.start && !topo?.end) return o;

		let p0 = pts[0];
		let p1 = pts[1];
		if (topo.start) {
			const ptr = dtoOf(topo.start.objectId);
			if (ptr?.graphObjectType === "pointer") {
				const w = getPipePortWorldForPointer(ptr, topo.start);
				if (w) p0 = w;
			}
		}
		if (topo.end) {
			const ptr = dtoOf(topo.end.objectId);
			if (ptr?.graphObjectType === "pointer") {
				const w = getPipePortWorldForPointer(ptr, topo.end);
				if (w) p1 = w;
			}
		}
		if (samePoint(p0, pts[0]) && samePoint(p1, pts[1])) return o;
		changed = true;
		return {
			...o,
			points: [{ ...p0 }, { ...p1 }],
		};
	});

	return changed ? out : list;
}
