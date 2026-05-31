import type { GraphicObjectDto, ObjectBaseData } from "../api/types";
import {
	canonicalFeatureType,
	isConsumerFeature,
	isMonitorFeature,
	isPipeFeature,
	isProducerFeature,
	isValveFeature,
} from "../model/schema/feature-type-aliases";
import { readBackendProperties } from "./object-fixed-on-scheme";

function isRecord(v: unknown): v is Record<string, unknown> {
	return typeof v === "object" && v !== null && !Array.isArray(v);
}

function readLeaf(node: unknown): string {
	if (!isRecord(node) || !("value" in node)) return "";
	return String(node.value ?? "").trim();
}

/** Подпись типа в «Данные регистрации.id» (Поставщик, Кран, …). */
export function featureRegistrationPrefix(featureObjectType: string): string {
	const code = canonicalFeatureType(featureObjectType);
	if (isProducerFeature(code)) return "Поставщик";
	if (isConsumerFeature(code)) return "Потребитель";
	if (isValveFeature(code)) return "Кран";
	if (isPipeFeature(code)) return "Труба";
	return code;
}

/** @deprecated Используйте `featureRegistrationPrefix`. */
export const featureLabelForMonitor = featureRegistrationPrefix;

/** Строка `Кран 9` по id объекта на схеме (как в EditedJSON). */
export function registrationLabelForObject(
	featureObjectType: string,
	objectId: number,
): string {
	return `${featureRegistrationPrefix(featureObjectType)} ${objectId}`;
}

export function readRegistrationId(
	properties: Record<string, unknown> | undefined,
): string {
	if (!properties) return "";
	const dr = properties["Данные регистрации"];
	if (!isRecord(dr)) return "";
	return readLeaf(dr.id);
}

export function setRegistrationIdInProperties(
	properties: Record<string, unknown>,
	label: string,
): void {
	let dr = properties["Данные регистрации"];
	if (!isRecord(dr)) {
		dr = {};
		properties["Данные регистрации"] = dr;
	}
	const prev = isRecord(dr.id) ? dr.id : {};
	dr.id = { ...prev, value: label };
}

export function applyRegistrationLabelToProperties(
	properties: Record<string, unknown>,
	featureObjectType: string,
	objectId: number,
): void {
	setRegistrationIdInProperties(
		properties,
		registrationLabelForObject(featureObjectType, objectId),
	);
}

/**
 * Исправляет пустые и дублирующиеся id в «Данные регистрации»,
 * а также несовпадение номера в подписи с `object.id` (шаблон «Кран 26» у всех новых кранов).
 */
export function repairRegistrationIds(
	objects: GraphicObjectDto<ObjectBaseData>[],
): boolean {
	let changed = false;
	const byKey = new Map<string, GraphicObjectDto<ObjectBaseData>[]>();

	for (const obj of objects) {
		if (isMonitorFeature(obj.featureObjectType)) continue;
		const props = readBackendProperties(obj.data);
		if (!props) continue;

		let reg = readRegistrationId(props);
		const expected = registrationLabelForObject(
			obj.featureObjectType,
			obj.id,
		);
		const prefix = featureRegistrationPrefix(obj.featureObjectType);
		const numbered = new RegExp(
			`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} (\\d+)$`,
		);

		if (!reg) {
			setRegistrationIdInProperties(props, expected);
			reg = expected;
			changed = true;
		} else {
			const m = reg.match(numbered);
			if (m && Number(m[1]) !== obj.id) {
				setRegistrationIdInProperties(props, expected);
				reg = expected;
				changed = true;
			}
		}

		const key = `${canonicalFeatureType(obj.featureObjectType)}\0${reg}`;
		const group = byKey.get(key) ?? [];
		group.push(obj);
		byKey.set(key, group);
	}

	for (const group of byKey.values()) {
		if (group.length <= 1) continue;
		for (const obj of group) {
			const props = readBackendProperties(obj.data);
			if (!props) continue;
			const expected = registrationLabelForObject(
				obj.featureObjectType,
				obj.id,
			);
			if (readRegistrationId(props) !== expected) {
				setRegistrationIdInProperties(props, expected);
				changed = true;
			}
		}
	}

	return changed;
}
