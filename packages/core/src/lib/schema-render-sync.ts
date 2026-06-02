import { markRaw } from "vue";
import type { Viewport } from "pixi-viewport";
import type { Container } from "pixi.js";
import type { GraphicObjectDto, ObjectBaseData, ObjectDescription } from "../api";
import {
	applyDtoToGraphicObject,
	createGraphicObjectFromDto,
	getDescriptionByType,
	isLinearGraphicObjectDto,
	isPointerGraphicObjectDto,
	type LinearGraphicObjectDto,
	type PointerGraphicObjectDto,
} from "../model/schema/graphic-object-dto-factory";
import { valveDescriptionForDto } from "./valve-state";
import { isMonitorFeature } from "../model/schema/feature-type-aliases";
import type { LinearGraphicObject } from "../model/schema/linear/linear-graphic-object";
import type { PointerGraphicObject } from "../model/schema/pointer/pointer-graphic-object";
import type { ITool } from "../api/itool";
import { isSchemaViewportChild } from "./schema-viewport-mark";
import { SCHEMA_GRID_LABEL } from "./schema-grid";

/** Порядок и состав объектов (добавление/удаление/смена типа). */
export function buildStructuralKey(
	objects: GraphicObjectDto<ObjectBaseData>[],
): string {
	return objects
		.map((o) => `${o.id}:${o.graphObjectType}:${o.featureObjectType}`)
		.join("|");
}

/** Отпечаток визуально значимых полей одного DTO. */
export function buildObjectFingerprint(
	dto: GraphicObjectDto<ObjectBaseData>,
): string {
	if (isPointerGraphicObjectDto(dto)) {
		return JSON.stringify({
			position: dto.position,
			rotateAngle: dto.rotateAngle,
			flipHorizontal: dto.flipHorizontal,
			flipVertical: dto.flipVertical,
			featureObjectType: dto.featureObjectType,
			data: dto.data,
		});
	}
	if (isLinearGraphicObjectDto(dto)) {
		return JSON.stringify({
			points: dto.points,
			featureObjectType: dto.featureObjectType,
			data: dto.data,
		});
	}
	return JSON.stringify(dto);
}

export function collectChangedObjectIds(
	objects: GraphicObjectDto<ObjectBaseData>[],
	previous: Map<number, string>,
): Set<number> {
	const changed = new Set<number>();
	for (const dto of objects) {
		const fp = buildObjectFingerprint(dto);
		if (previous.get(dto.id) !== fp) {
			changed.add(dto.id);
		}
	}
	return changed;
}

export function rebuildFingerprintMap(
	objects: GraphicObjectDto<ObjectBaseData>[],
): Map<number, string> {
	const map = new Map<number, string>();
	for (const dto of objects) {
		map.set(dto.id, buildObjectFingerprint(dto));
	}
	return map;
}

/** Вычисляет новые отпечатки и список изменившихся id за ОДИН проход (вместо collect+rebuild). */
export function diffFingerprints(
	objects: GraphicObjectDto<ObjectBaseData>[],
	previous: Map<number, string>,
): { changed: Set<number>; next: Map<number, string> } {
	const next = new Map<number, string>();
	const changed = new Set<number>();
	for (const dto of objects) {
		const fp = buildObjectFingerprint(dto);
		next.set(dto.id, fp);
		if (previous.get(dto.id) !== fp) {
			changed.add(dto.id);
		}
	}
	for (const id of previous.keys()) {
		if (!next.has(id)) {
			changed.add(id);
		}
	}
	return { changed, next };
}

export type GraphicModelMaps = {
	pointers: Map<number, PointerGraphicObject>;
	linears: Map<number, LinearGraphicObject>;
};

export function createGraphicModelsFromDtos(
	objects: GraphicObjectDto<ObjectBaseData>[],
	descriptions: ObjectDescription[],
): {
	pointerObjs: PointerGraphicObject[];
	linearObjs: LinearGraphicObject[];
	maps: GraphicModelMaps;
} {
	const pointers = new Map<number, PointerGraphicObject>();
	const linears = new Map<number, LinearGraphicObject>();

	for (const dto of objects) {
		if (isPointerGraphicObjectDto(dto)) {
			const base = getDescriptionByType(
				descriptions,
				dto.featureObjectType,
			);
			const obj = markRaw(
				createGraphicObjectFromDto(
					dto,
					valveDescriptionForDto(base, dto),
				) as PointerGraphicObject,
			);
			pointers.set(dto.id, obj);
		} else if (isLinearGraphicObjectDto(dto)) {
			const obj = markRaw(
				createGraphicObjectFromDto(
					dto,
					getDescriptionByType(descriptions, dto.featureObjectType),
				) as LinearGraphicObject,
			);
			linears.set(dto.id, obj);
		}
	}

	return {
		pointerObjs: [...pointers.values()],
		linearObjs: [...linears.values()],
		maps: { pointers, linears },
	};
}

export function collectViewportPatchIds(
	objects: GraphicObjectDto<ObjectBaseData>[],
	previousFingerprints: Map<number, string>,
): Set<number> {
	const patch = collectChangedObjectIds(objects, previousFingerprints);
	const currentIds = new Set(objects.map((o) => o.id));
	for (const id of previousFingerprints.keys()) {
		if (!currentIds.has(id)) {
			patch.add(id);
		}
	}
	return patch;
}

export function syncGraphicModelsIncremental(
	objects: GraphicObjectDto<ObjectBaseData>[],
	descriptions: ObjectDescription[],
	maps: GraphicModelMaps,
): void {
	const nextPointerIds = new Set<number>();
	const nextLinearIds = new Set<number>();

	for (const dto of objects) {
		if (isPointerGraphicObjectDto(dto)) {
			nextPointerIds.add(dto.id);
			const base = getDescriptionByType(
				descriptions,
				dto.featureObjectType,
			);
			const desc = valveDescriptionForDto(base, dto);
			let obj = maps.pointers.get(dto.id);
			if (!obj) {
				obj = markRaw(
					createGraphicObjectFromDto(dto, desc) as PointerGraphicObject,
				);
				maps.pointers.set(dto.id, obj);
			} else {
				applyDtoToGraphicObject(obj, dto, desc);
			}
		} else if (isLinearGraphicObjectDto(dto)) {
			nextLinearIds.add(dto.id);
			const desc = getDescriptionByType(
				descriptions,
				dto.featureObjectType,
			);
			let obj = maps.linears.get(dto.id);
			if (!obj) {
				obj = markRaw(
					createGraphicObjectFromDto(dto, desc) as LinearGraphicObject,
				);
				maps.linears.set(dto.id, obj);
			} else {
				applyDtoToGraphicObject(obj, dto, desc);
			}
		}
	}

	for (const id of [...maps.pointers.keys()]) {
		if (!nextPointerIds.has(id)) {
			maps.pointers.delete(id);
		}
	}
	for (const id of [...maps.linears.keys()]) {
		if (!nextLinearIds.has(id)) {
			maps.linears.delete(id);
		}
	}
}

export function removeViewportObjectById(vp: Viewport, id: number): void {
	const idLabel = id.toString();
	const container = vp.getChildByLabel(idLabel);
	if (container) {
		vp.removeChild(container);
		container.destroy({ children: true });
	}
	const shadow = vp.getChildByLabel(`${idLabel}-shadow`);
	if (shadow) {
		vp.removeChild(shadow);
		shadow.destroy();
	}
	for (let i = 0; i < 64; i++) {
		const node = vp.getChildByLabel(`${idLabel}-${i}`);
		if (!node) break;
		vp.removeChild(node);
		node.destroy();
	}
}

export function clearSchemaViewportLayers(vp: Viewport): void {
	for (const child of [...vp.children]) {
		if (child.label === SCHEMA_GRID_LABEL) continue;
		if (isSchemaViewportChild(child)) {
			vp.removeChild(child);
			child.destroy({ children: true });
		}
	}
}

export function patchPointerOnViewport(
	vp: Viewport,
	obj: PointerGraphicObject,
	dto: PointerGraphicObjectDto,
	tool: ITool,
): void {
	const idLabel = obj.idObject.toString();
	const existing = vp.getChildByLabel(idLabel) as Container | null;

	if (isMonitorFeature(obj.featureObjectType)) {
		if (existing) {
			vp.removeChild(existing);
			existing.destroy({ children: true });
		}
		obj.draw(vp, tool);
		return;
	}

	if (!existing) {
		obj.draw(vp, tool);
		return;
	}

	existing.position.set(obj.position.x, obj.position.y);
	existing.rotation = (obj.rotationAngle * Math.PI) / 180;
	obj.redraw(vp);
}

export function patchLinearOnViewport(
	vp: Viewport,
	obj: LinearGraphicObject,
	dto: LinearGraphicObjectDto,
	tool: ITool,
): void {
	const idLabel = obj.idObject.toString();
	const existing = vp.getChildByLabel(idLabel);
	if (!existing) {
		obj.draw(vp, tool);
		return;
	}
	obj.refreshPath(dto.points, vp);
}
