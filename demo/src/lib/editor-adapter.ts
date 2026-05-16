import type {
	GraphicObjectDto,
	ObjectBaseData,
	ObjectDescription,
} from "../../../packages/core/src/api/types";
import { baseDescriptors } from "../data/descriptors";
import type { DemoApiObject } from "../data/base-objects";
import { getMetamodelObjectTypeByCode } from "../data/metamodel-db.stub";

export type EditorPayload = {
	objects: GraphicObjectDto<ObjectBaseData>[];
	descriptions: ObjectDescription[];
};

export function mapApiToEditorPayload(apiObjects: DemoApiObject[]): EditorPayload {
	const objects: GraphicObjectDto<ObjectBaseData>[] = apiObjects.map((obj) => {
		const metaId = (code: string) => getMetamodelObjectTypeByCode(code)?.id;

		if (obj.kind === "gate_valve") {
			return {
				id: obj.id,
				featureObjectType: "gate_valve",
				graphObjectType: "pointer",
				position: obj.position,
				data: {
					techObjectId: obj.techObjectId,
					objectTypeId: metaId("gate_valve"),
				},
			};
		}

		if (obj.kind === "supplier") {
			return {
				id: obj.id,
				featureObjectType: "supplier",
				graphObjectType: "pointer",
				position: obj.position,
				data: {
					techObjectId: obj.techObjectId,
					objectTypeId: metaId("supplier"),
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
