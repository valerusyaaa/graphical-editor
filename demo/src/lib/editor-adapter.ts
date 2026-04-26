import type {
	GraphicObjectDto,
	ObjectBaseData,
	ObjectDescription,
} from "../../../packages/core/src/api/types";
import { baseDescriptors } from "../data/descriptors";
import type { DemoApiObject } from "../data/base-objects";

export type EditorPayload = {
	objects: GraphicObjectDto<ObjectBaseData>[];
	descriptions: ObjectDescription[];
};

export function mapApiToEditorPayload(apiObjects: DemoApiObject[]): EditorPayload {
	const objects: GraphicObjectDto<ObjectBaseData>[] = apiObjects.map((obj) => {
		if (obj.kind === "valve") {
			return {
				id: obj.id,
				featureObjectType: "valve",
				graphObjectType: "pointer",
				position: obj.position,
				data: { techObjectId: obj.techObjectId },
			};
		}

		return {
			id: obj.id,
			featureObjectType: "pipe",
			graphObjectType: "linear",
			points: obj.points,
			data: { techObjectId: obj.techObjectId },
		};
	});

	return {
		objects,
		descriptions: baseDescriptors,
	};
}
