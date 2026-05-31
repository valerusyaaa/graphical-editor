import type { GraphicObjectDto, ObjectBaseData } from "../../../packages/core/src/api/types";
import {
	getMetamodelObjectTypeById,
	type MetamodelDragPayload,
} from "../data/metamodel-db.stub";
import { getDescriptionByType } from "../../../packages/core/src/model/schema/graphic-object-dto-factory";
import type { ObjectDescription } from "../../../packages/core/src/api/types";
import {
	canonicalFeatureType,
	isMonitorFeature,
	isValveFeature,
} from "../../../packages/core/src/model/schema/feature-type-aliases";
import { createDefaultMonitorBackendProperties } from "../../../packages/core/src/lib/monitor-object";
import { setValveOpenInProperties } from "../../../packages/core/src/lib/valve-state";
import { ensureChartObjectIds } from "../../../packages/core/src/lib/chart-object-map";
import { applyRegistrationLabelToProperties } from "../../../packages/core/src/lib/registration-id";
import { getDefaultPropertiesForFeature } from "./backend-property-templates";

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
	const mmType = getMetamodelObjectTypeById(payload.objectTypeId);
	const featureCode = canonicalFeatureType(
		mmType?.editorFeature ?? payload.code,
	);

	// Проверка: для типа есть дескриптор отображения
	getDescriptionByType(descriptions, featureCode);

	const id = nextObjectId(objects);
	const techObjectId = nextTechObjectId(objects);
	const defaults = getDefaultPropertiesForFeature(featureCode);
	if (Object.keys(defaults).length) {
		applyRegistrationLabelToProperties(defaults, featureCode, id);
		if (isValveFeature(featureCode)) {
			setValveOpenInProperties(defaults, false);
		}
	}
	if (isMonitorFeature(featureCode)) {
		const data: ObjectBaseData = {
			techObjectId,
			objectTypeId: payload.objectTypeId,
			monitorSourceId: 0,
			monitorResultSlots: Array(10).fill(""),
			backendProperties: createDefaultMonitorBackendProperties("Монитор"),
		};
		return {
			id,
			featureObjectType: featureCode,
			graphObjectType: "pointer",
			position: { x: world.x, y: world.y },
			data,
		};
	}
	const data: ObjectBaseData = {
		techObjectId,
		objectTypeId: payload.objectTypeId,
		...(Object.keys(defaults).length
			? { backendProperties: defaults }
			: {}),
	};

	if (payload.graphObjectType === "linear") {
		const segmentLength = 140;
		return {
			id,
			featureObjectType: featureCode,
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
		featureObjectType: featureCode,
		graphObjectType: "pointer",
		position: { x: world.x, y: world.y },
		data,
	};
}
