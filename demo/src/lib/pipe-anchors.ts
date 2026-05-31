import type { GraphicObjectDto, ObjectBaseData, PipePortLink } from "../../../packages/core/src/api/types";
import {
	CONSUMER_POINTER_SIDE,
	PRODUCER_POINTER_SIZE,
} from "../../../packages/core/src/model/schema/pointer/pointer-graphic-object";
import {
	isProducerFeature,
	isConsumerFeature,
	isValveFeature,
} from "../../../packages/core/src/model/schema/feature-type-aliases";
import { baseDescriptors } from "../data/descriptors";

export type XY = { x: number; y: number };

function boundsOfPolynom(points: XY[]): {
	minX: number;
	maxX: number;
	minY: number;
	maxY: number;
} {
	const xs = points.map((p) => p.x);
	const ys = points.map((p) => p.y);
	return {
		minX: Math.min(...xs),
		maxX: Math.max(...xs),
		minY: Math.min(...ys),
		maxY: Math.max(...ys),
	};
}

const valvePolynom =
	baseDescriptors.find((d) => d.featureObjectType === "Valve")?.polynom ??
	([
		{ x: 20, y: 75 },
		{ x: 50, y: 50 },
		{ x: 80, y: 75 },
		{ x: 80, y: 25 },
		{ x: 50, y: 50 },
		{ x: 20, y: 25 },
	] as XY[]);

const valveBounds = boundsOfPolynom(valvePolynom);

/** junction 0 — левый порт по центру, 1 — правый (соединение с трубой с двух сторон). */
export function getValvePortWorld(position: XY, junction: 0 | 1): XY {
	const { minX, maxX, minY, maxY } = valveBounds;
	const midY = (minY + maxY) / 2;
	if (junction === 1) {
		return { x: position.x + maxX, y: position.y + midY };
	}
	return { x: position.x + minX, y: position.y + midY };
}

export type ValveHit = {
	object: GraphicObjectDto<ObjectBaseData>;
	/** 0 — левый порт, 1 — правый */
	junction: 0 | 1;
};

/** @deprecated используйте ValveHit */
export type GateValveHit = ValveHit;

/** Клик по крану: порт — ближайший из двух (левый / правый). */
export function hitTestValve(
	objects: GraphicObjectDto<ObjectBaseData>[],
	world: XY,
): ValveHit | null {
	const { minX, maxX, minY, maxY } = valveBounds;
	for (const o of objects) {
		if (o.graphObjectType !== "pointer") continue;
		if (!isValveFeature(o.featureObjectType) || !o.position) continue;
		const { x, y } = o.position;
		const wx0 = x + minX;
		const wx1 = x + maxX;
		const wy0 = y + minY;
		const wy1 = y + maxY;
		if (world.x < wx0 || world.x > wx1 || world.y < wy0 || world.y > wy1) continue;
		const left = getValvePortWorld(o.position, 0);
		const right = getValvePortWorld(o.position, 1);
		const dl = Math.hypot(world.x - left.x, world.y - left.y);
		const dr = Math.hypot(world.x - right.x, world.y - right.y);
		const junction: 0 | 1 = dl <= dr ? 0 : 1;
		return { object: o, junction };
	}
	return null;
}

/** @deprecated используйте getValvePortWorld */
export const getGateValvePortWorld = getValvePortWorld;

/** @deprecated используйте hitTestValve */
export const hitTestGateValve = hitTestValve;

/**
 * Мировые координаты порта указателя по типу объекта и junction (для синхронизации трубы).
 */
export function getPipePortWorldForPointer(
	dto: GraphicObjectDto<ObjectBaseData>,
	link: PipePortLink,
): XY | null {
	const pos = dto.position;
	if (!pos || dto.graphObjectType !== "pointer") return null;
	if (isProducerFeature(dto.featureObjectType)) {
		return getSupplierOutletWorld(pos);
	}
	if (isConsumerFeature(dto.featureObjectType)) {
		return getConsumerInletWorld(pos);
	}
	if (isValveFeature(dto.featureObjectType)) {
		const j: 0 | 1 = link.junction === 1 ? 1 : 0;
		return getValvePortWorld(pos, j);
	}
	return null;
}

/** Мировые координаты выхода поставщика: правый край квадрата, середина по вертикали. */
export function getSupplierOutletWorld(position: XY): XY {
	const s = PRODUCER_POINTER_SIZE;
	return { x: position.x + s, y: position.y + s / 2 };
}

/** Мировые координаты входа потребителя: левый край треугольника, середина основания. */
export function getConsumerInletWorld(position: XY): XY {
	return { x: position.x, y: position.y + CONSUMER_POINTER_SIDE / 2 };
}

function consumerOuterWidth(): number {
	return (CONSUMER_POINTER_SIDE * Math.sqrt(3)) / 2;
}

export function hitTestSupplier(
	objects: GraphicObjectDto<ObjectBaseData>[],
	world: XY,
): GraphicObjectDto<ObjectBaseData> | null {
	const s = PRODUCER_POINTER_SIZE;
	for (const o of objects) {
		if (o.graphObjectType !== "pointer") continue;
		if (!isProducerFeature(o.featureObjectType) || !o.position) continue;
		const { x, y } = o.position;
		if (world.x >= x && world.x <= x + s && world.y >= y && world.y <= y + s) {
			return o;
		}
	}
	return null;
}

export function hitTestConsumer(
	objects: GraphicObjectDto<ObjectBaseData>[],
	world: XY,
): GraphicObjectDto<ObjectBaseData> | null {
	const h = CONSUMER_POINTER_SIDE;
	const w = consumerOuterWidth();
	for (const o of objects) {
		if (o.graphObjectType !== "pointer") continue;
		if (o.featureObjectType !== "consumer" || !o.position) continue;
		const { x, y } = o.position;
		if (world.x >= x && world.x <= x + w && world.y >= y && world.y <= y + h) {
			return o;
		}
	}
	return null;
}
