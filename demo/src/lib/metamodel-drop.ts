import type { GraphicObjectDto, ObjectBaseData } from "../../../packages/core/src/api/types";
import type { MetamodelDragPayload } from "../data/metamodel-db.stub";
import { getDescriptionByType } from "../../../packages/core/src/model/schema/graphic-object-dto-factory";
import type { ObjectDescription } from "../../../packages/core/src/api/types";

function nextObjectId(objects: GraphicObjectDto<ObjectBaseData>[]): number {
	if (!objects.length) return 1;
	return Math.max(...objects.map((o) => o.id)) + 1;
}

function nextTechObjectId(objects: GraphicObjectDto<ObjectBaseData>[]): number {
	let m = 0;
	for (const o of objects) {
		const id = o.data?.techObjectId;
		if (typeof id === "number" && id > m) m = id;
	}
	return m + 1;
}

/**
 * Создаёт DTO экземпляра объекта схемы по типу из метамодели.
 * Экземпляр ссылается на `object_types.id`; визуализация — по `code` → `ObjectDescription`.
 */
export function createInstanceFromMetamodelDrop(
	payload: MetamodelDragPayload,
	world: { x: number; y: number },
	objects: GraphicObjectDto<ObjectBaseData>[],
	descriptions: ObjectDescription[],
): GraphicObjectDto<ObjectBaseData> {
	// Проверка: для типа есть дескриптор отображения
	getDescriptionByType(descriptions, payload.code);

	const id = nextObjectId(objects);
	const techObjectId = nextTechObjectId(objects);
	const data: ObjectBaseData = {
		techObjectId,
		objectTypeId: payload.objectTypeId,
	};

	if (payload.graphObjectType === "linear") {
		const segmentLength = 140;
		return {
			id,
			featureObjectType: payload.code,
			graphObjectType: "linear",
			points: [
				{ x: world.x - segmentLength / 2, y: world.y },
				{ x: world.x + segmentLength / 2, y: world.y },
			],
			data,
		};
	}

	return {
		id,
		featureObjectType: payload.code,
		graphObjectType: "pointer",
		position: { x: world.x, y: world.y },
		data,
	};
}
