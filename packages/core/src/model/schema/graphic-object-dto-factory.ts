import type { ObjectInfo, ObjectType, XYPosition } from "./types";
import { LinearGraphicObject } from "./linear/linear-graphic-object";
import { PointerGraphicObject } from "./pointer/pointer-graphic-object";
import { Prettify } from "../shared";
import type {
	GraphicObjectDto,
	ObjectBaseData,
	ObjectDescription,
} from "../../api";
import { canonicalFeatureType, isMonitorFeature } from "./feature-type-aliases";
import { getMonitorCaption } from "../../lib/monitor-object";

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
): dto is PointerGraphicObjectDto {
	return dto.graphObjectType === "pointer" && dto.position !== undefined;
}

function toObjectInfo<Data extends ObjectBaseData>(
	dto: GraphicObjectDto<Data>,
	description: ObjectDescription,
): ObjectInfo<Data> {
	return {
		id: dto.id,
		objectType: dto.graphObjectType,
		featureObjectType: dto.featureObjectType,
		position: dto.position ? { ...dto.position } : dto.position,
		points: dto.points?.map((p) => ({ ...p })),
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
		selectionStrokeColor: description.selectionStrokeColor,
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

/** Обновляет поля существующей модели без пересоздания Pixi-контейнера. */
export function applyDtoToGraphicObject(
	target: PointerGraphicObject | LinearGraphicObject,
	dto: GraphicObjectDto<ObjectBaseData>,
	description: ObjectDescription,
): void {
	const info = toObjectInfo(dto, description);
	target.data = info.data;

	if (target instanceof PointerGraphicObject && isPointerGraphicObjectDto(dto)) {
		target.featureObjectType = info.featureObjectType ?? "";
		target.rotationAngle = info.rotateAngle ?? 0;
		target.flipHorizontal = info.flipHorizontal ?? false;
		target.flipVertical = info.flipVertical ?? false;
		target.offsets = info.offsets ?? { left: 0, top: 0 };
		if (info.position) {
			target.position = {
				x: info.position.x - target.offsets.left,
				y: info.position.y - target.offsets.top,
			};
		}
		target.fillColor = info.fillColor ?? "transparent";
		target.strokeColor = info.strokeColor ?? "transparent";
		target.polynom = info.polynom ?? [];
		target.strokeWidth = info.strokeWidth ?? 1;
		target.selectionStrokeColor = info.selectionStrokeColor ?? "#fca5a5";
		const data = info.data;
		if (isMonitorFeature(target.featureObjectType) && data) {
			target.monitorDisplayLines = data.monitorDisplayLines ?? [];
			target.monitorCaption = getMonitorCaption({
				id: target.idObject,
				featureObjectType: target.featureObjectType,
				graphObjectType: "pointer",
				data,
			});
		}
		return;
	}

	if (target instanceof LinearGraphicObject && isLinearGraphicObjectDto(dto)) {
		target.points =
			info.points && info.points.length > 0
				? info.points.map((p) => ({ ...p }))
				: target.points;
		target.thickness = info.thikness ?? target.thickness;
		target.fillColor = info.fillColor ?? target.fillColor;
		target.selectionStrokeColor =
			info.selectionStrokeColor ?? target.selectionStrokeColor;
	}
}

export function getDescriptionByType(
	descriptions: ObjectDescription[],
	featureType: string,
): ObjectDescription {
	const want = canonicalFeatureType(featureType);
	const description = descriptions.find(
		(d) => canonicalFeatureType(d.featureObjectType) === want,
	);
	if (!description) {
		throw new Error(`Description not found for type: ${featureType}`);
	}
	return description;
}
