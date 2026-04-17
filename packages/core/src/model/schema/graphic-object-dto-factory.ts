import type { ObjectInfo, ObjectType, XYPosition } from "./types";
import { LinearGraphicObject } from "./linear/linear-graphic-object";
import { PointerGraphicObject } from "./pointer/pointer-graphic-object";
import { Prettify } from "../shared";
import type {
	GraphicObjectDto,
	ObjectBaseData,
	ObjectDescription,
} from "../../api";

export type LinearGraphicObjectDto = Prettify<
	GraphicObjectDto<ObjectBaseData> & {
		graphObjectType: "linear";
		points: XYPosition[];
	}
>;

export type PointerGraphicObjectDto = Prettify<
	GraphicObjectDto<ObjectBaseData> & {
		graphObjectType: "pointer";
		position: XYPosition;
	}
>;

export function isLinearGraphicObjectDto(
	dto: GraphicObjectDto<ObjectBaseData>,
): dto is LinearGraphicObjectDto {
	return dto.graphObjectType === "linear" && Array.isArray(dto.points);
}

export function isPointerGraphicObjectDto(
	dto: GraphicObjectDto<ObjectBaseData>,
) {
	return dto.graphObjectType === "pointer" && dto.position !== undefined;
}

function toObjectInfo<Data extends ObjectBaseData>(
	dto: GraphicObjectDto<Data>,
	description: ObjectDescription,
): ObjectInfo<Data> {
	return {
		id: dto.id,
		objectType: dto.graphObjectType,
		position: dto.position,
		points: dto.points,
		rotateAngle: dto.rotateAngle,
		flipHorizontal: dto.flipHorizontal,
		flipVertical: dto.flipVertical,
		strokeWidth: description.strokeWidth,
		data: dto.data,
		thikness: description.thikness,
		offsets: description.offsets,
		polynom: description.polynom,
		fillColor: description.fillColor,
		strokeColor: description.strokeColor,
	};
}

export function createGraphicObjectFromDto(
	dto: GraphicObjectDto<ObjectBaseData>,
	description: ObjectDescription,
): PointerGraphicObject | LinearGraphicObject {
	if (isPointerGraphicObjectDto(dto)) {
		return new PointerGraphicObject(toObjectInfo(dto, description));
	}
	if (isLinearGraphicObjectDto(dto)) {
		return new LinearGraphicObject(toObjectInfo(dto, description));
	}
	throw new Error(`Invalid graphic object dto. ${dto}`);
}
