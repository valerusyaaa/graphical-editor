import type {
	GraphicObjectDto,
	ObjectBaseData,
	ObjectDescription,
} from "../../../packages/core/src/api/types";
import { baseDescriptors } from "../data/descriptors";
import type { DemoApiObject } from "../data/base-objects";
import { getMetamodelObjectTypeByCode } from "../data/metamodel-db.stub";
import type { BackendSchemeEnvelope } from "./backend-scheme-import";

export type EditorPayload = {
	objects: GraphicObjectDto<ObjectBaseData>[];
	descriptions: ObjectDescription[];
	/** Свойства корневого объекта Schema (при импорте бэкенд-JSON). */
	schemaProperties?: Record<string, unknown>;
	/** Объекты схемы, не отображаемые в редакторе (Monitor и т.п.). */
	extraBackendObjects?: Record<string, unknown>[];
	/** Поля корня EditedJSON (configVersion, currentZoom, references, …) для кругового экспорта. */
	backendEnvelope?: BackendSchemeEnvelope;
};

export function mapApiToEditorPayload(apiObjects: DemoApiObject[]): EditorPayload {
	const objects: GraphicObjectDto<ObjectBaseData>[] = apiObjects.map((obj) => {
		const metaId = (code: string) => getMetamodelObjectTypeByCode(code)?.id;

		if (obj.kind === "Valve" || obj.kind === "gate_valve") {
			return {
				id: obj.id,
				featureObjectType: "Valve",
				graphObjectType: "pointer",
				position: obj.position,
				data: {
					techObjectId: obj.techObjectId,
					objectTypeId: metaId("Valve"),
				},
			};
		}

		if (obj.kind === "Producer" || obj.kind === "supplier") {
			return {
				id: obj.id,
				featureObjectType: "Producer",
				graphObjectType: "pointer",
				position: obj.position,
				data: {
					techObjectId: obj.techObjectId,
					objectTypeId: metaId("Producer"),
				},
			};
		}

		if (obj.kind === "consumer") {
			return {
				id: obj.id,
				featureObjectType: "consumer",
				graphObjectType: "pointer",
				position: obj.position,
				data: {
					techObjectId: obj.techObjectId,
					objectTypeId: metaId("consumer"),
				},
			};
		}

		return {
			id: obj.id,
			featureObjectType: "pipe",
			graphObjectType: "linear",
			points: obj.points,
			data: {
				techObjectId: obj.techObjectId,
				objectTypeId: metaId("pipe"),
			},
		};
	});

	return {
		objects,
		descriptions: baseDescriptors,
	};
}
