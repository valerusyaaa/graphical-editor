import type { ObjectDescription } from "../api/types";
import type { GraphicObjectDto, ObjectBaseData } from "../api/types";
import { isValveFeature } from "../model/schema/feature-type-aliases";

export const VALVE_STATE_PROPERTY_KEY = "Состояние";

/** Закрыт — красный (как в дескрипторе по умолчанию). */
export const VALVE_COLORS_CLOSED = {
	fillColor: "#ef4444",
	strokeColor: "#b91c1c",
	selectionStrokeColor: "#fca5a5",
} as const;

/** Открыт — ярко-зелёный. */
export const VALVE_COLORS_OPEN = {
	fillColor: "#22c55e",
	strokeColor: "#15803d",
	selectionStrokeColor: "#86efac",
} as const;

function isRecord(v: unknown): v is Record<string, unknown> {
	return typeof v === "object" && v !== null && !Array.isArray(v);
}

function readStateLeaf(
	properties: Record<string, unknown> | undefined,
): string {
	if (!properties) return "0";
	const node = properties[VALVE_STATE_PROPERTY_KEY];
	if (!isRecord(node) || !("value" in node)) return "0";
	return String(node.value ?? "0");
}

/**
 * SimplePipe / ValveBinaryState: `0` — открыт, `1` — закрыт.
 * (как в dispatcher и в шаблонах EditedJSON).
 */
export function isValveOpenFromProperties(
	properties: Record<string, unknown> | undefined,
): boolean {
	if (!properties) return false;
	const node = properties[VALVE_STATE_PROPERTY_KEY];
	if (isRecord(node) && "value" in node) {
		const raw = node.value;
		if (raw === 0 || raw === false) return true;
		if (raw === 1 || raw === true) return false;
	}
	const v = readStateLeaf(properties).trim();
	if (v === "0") return true;
	if (v === "1") return false;
	return v.toLowerCase() === "true";
}

export function setValveOpenInProperties(
	properties: Record<string, unknown>,
	open: boolean,
): void {
	const value = open ? "0" : "1";
	const cur = properties[VALVE_STATE_PROPERTY_KEY];
	if (isRecord(cur) && "value" in cur) {
		cur.value = value;
	} else {
		properties[VALVE_STATE_PROPERTY_KEY] = { value };
	}
}

export function valveDescriptionForDto(
	description: ObjectDescription,
	dto: GraphicObjectDto<ObjectBaseData>,
): ObjectDescription {
	if (!isValveFeature(dto.featureObjectType)) return description;
	const props = dto.data?.backendProperties as
		| Record<string, unknown>
		| undefined;
	const colors = isValveOpenFromProperties(props)
		? VALVE_COLORS_OPEN
		: VALVE_COLORS_CLOSED;
	return {
		...description,
		...colors,
	};
}
