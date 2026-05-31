import type { GraphicObjectDto, ObjectBaseData } from "../../../packages/core/src/api/types";
import { roundNumericToString } from "./numeric-format";



type AnyRec = Record<string, unknown>;



type CalcValueUpdate = { code: string; value: number | string };



function isRecord(v: unknown): v is AnyRec {

	return typeof v === "object" && v !== null && !Array.isArray(v);

}



function isValueLeaf(node: unknown): boolean {

	return (

		isRecord(node) &&

		"value" in node &&

		(typeof node.value === "string" || typeof node.value === "number")

	);

}



function deepClone<T>(v: T): T {

	return JSON.parse(JSON.stringify(v)) as T;

}



function deepMergeBackendProperties(

	target: AnyRec,

	source: AnyRec,

): void {

	for (const key of Object.keys(source)) {

		const sv = source[key];

		const tv = target[key];

		if (

			isRecord(sv) &&

			isRecord(tv) &&

			!isValueLeaf(sv) &&

			!isValueLeaf(tv)

		) {

			deepMergeBackendProperties(tv, sv);

			continue;

		}

		target[key] = deepClone(sv);

	}

}



function propertiesFromBackendObject(obj: AnyRec): AnyRec | null {

	const props = obj.properties ?? obj.Properties;

	return isRecord(props) ? (props as AnyRec) : null;

}



/** Ищет, где в шаблоне уже лежит поле (например `Results` → `Qвх::Result`). */

function findPathToPropertyKey(

	node: AnyRec,

	key: string,

	prefix: string[] = [],

): string[] | null {

	if (Object.prototype.hasOwnProperty.call(node, key)) {

		const leaf = node[key];

		if (isValueLeaf(leaf) || isRecord(leaf)) return [...prefix, key];

	}

	for (const [seg, child] of Object.entries(node)) {

		if (!isRecord(child) || isValueLeaf(child)) continue;

		const hit = findPathToPropertyKey(child, key, [...prefix, seg]);

		if (hit) return hit;

	}

	return null;

}



/**

 * Куда записать `parameterCode` из CalculationService (5041).

 * Бэкенд шлёт плоский код (`P::Result`, `Qвх::Result`), а в EditedJSON поле внутри `Results`.

 */

export function resolveCalculationParameterPath(

	targetProps: AnyRec,

	parameterCode: string,

): string[] {

	const code = parameterCode.trim();

	if (!code) return [];

	if (code.includes(".")) return code.split(".");



	const existing = findPathToPropertyKey(targetProps, code);

	if (existing) return existing;



	if (code.endsWith("::Result")) return ["Results", code];

	if (code === "Pз") return ["Results", "P::Result"];
	if (code === "Qз") return ["Results", "Q::Result"];
	if (code === "Tз") return ["Results", "T::Result"];



	return [code];

}



function setLeafByPath(

	props: AnyRec,

	path: string[],

	value: number | string,

): void {

	if (!path.length) return;

	let cur: AnyRec = props;

	for (let i = 0; i < path.length - 1; i++) {

		const seg = path[i]!;

		const next = cur[seg];

		if (!isRecord(next)) cur[seg] = {};

		cur = cur[seg] as AnyRec;

	}

	const leafKey = path[path.length - 1]!;

	const strVal =
		typeof value === "number" ||
		(typeof value === "string" && value.trim() !== "")
			? roundNumericToString(value)
			: String(value);

	const leaf = cur[leafKey];

	if (isValueLeaf(leaf)) leaf.value = strVal;

	else cur[leafKey] = { value: strVal };

}



function applyCalculationValue(

	targetProps: AnyRec,

	code: string,

	value: number | string,

): void {

	const path = resolveCalculationParameterPath(targetProps, code);

	setLeafByPath(targetProps, path, value);

}

/** Убирает дубликаты после старого маппинга (поле и в корне, и в `Results` / `Замер`). */
function removeStrayDuplicatePropertyKeys(props: AnyRec): void {
	const nestedKeys = new Set<string>();
	const scan = (node: AnyRec, depth: number) => {
		for (const [key, val] of Object.entries(node)) {
			if (depth > 0 && isValueLeaf(val)) nestedKeys.add(key);
			else if (isRecord(val) && !isValueLeaf(val)) scan(val, depth + 1);
		}
	};
	scan(props, 0);
	for (const key of Object.keys(props)) {
		if (!nestedKeys.has(key) || !isValueLeaf(props[key])) continue;
		delete props[key];
	}
}

/** Ответ 5041: `{ values: [{ objectId, parameterCode, value }] }`. */

function collectCalculationValues(

	node: AnyRec,

	byObject: Map<number, CalcValueUpdate[]>,

): void {

	const values = node.values ?? node.Values;

	if (!Array.isArray(values)) return;



	for (const item of values) {

		if (!isRecord(item)) continue;

		const objectId = Number(item.objectId ?? item.ObjectId);

		const code = item.parameterCode ?? item.ParameterCode;

		const val = item.value ?? item.Value;

		if (!Number.isFinite(objectId) || objectId <= 0 || code == null) continue;



		const codeStr = String(code).trim();

		if (!codeStr) continue;



		const list = byObject.get(objectId) ?? [];

		list.push({ code: codeStr, value: val as number | string });

		byObject.set(objectId, list);

	}

}



function resolveObjectKey(obj: AnyRec): number | null {

	const candidates = [

		obj.id,

		obj.Id,

		obj.objectId,

		obj.ObjectId,

		obj.techObjectId,

		obj.TechObjectId,

	];

	for (const c of candidates) {

		const n = Number(c);

		if (Number.isFinite(n) && n > 0) return n;

	}

	return null;

}



/** Извлекает обновления: id объекта → список пар (parameterCode, value). */

export function extractCalculationValueUpdates(

	result: unknown,

): Map<number, CalcValueUpdate[]> {

	const byObject = new Map<number, CalcValueUpdate[]>();



	const addFromObject = (obj: AnyRec) => {

		const id = resolveObjectKey(obj);

		const props = propertiesFromBackendObject(obj);

		if (id == null || !props) return;

		const prev = byObject.get(id) ?? [];

		for (const [key, val] of Object.entries(props)) {

			if (isValueLeaf(val)) {

				prev.push({ code: key, value: val.value as number | string });

			} else if (isRecord(val)) {

				for (const [subKey, subVal] of Object.entries(val)) {

					if (isValueLeaf(subVal)) {

						prev.push({

							code: `${key}.${subKey}`,

							value: subVal.value as number | string,

						});

					}

				}

			}

		}

		byObject.set(id, prev);

	};



	const walk = (node: unknown) => {

		if (!node) return;

		if (Array.isArray(node)) {

			for (const item of node) {

				if (isRecord(item)) addFromObject(item);

			}

			return;

		}

		if (!isRecord(node)) return;



		collectCalculationValues(node, byObject);



		if (Array.isArray(node.objects)) {

			for (const o of node.objects) {

				if (isRecord(o)) addFromObject(o);

			}

		}

		if (Array.isArray(node.Objects)) {

			for (const o of node.Objects) {

				if (isRecord(o)) addFromObject(o);

			}

		}



		const data = node.data ?? node.Data;

		if (isRecord(data)) walk(data);

		const scheme = node.scheme ?? node.Scheme;

		if (isRecord(scheme)) walk(scheme);



		for (const [key, val] of Object.entries(node)) {

			if (!/^\d+$/.test(key)) continue;

			if (isRecord(val)) {

				const props = propertiesFromBackendObject(val);

				if (props) {

					const id = Number(key);

					const prev = byObject.get(id) ?? [];

					for (const [pkey, pval] of Object.entries(props)) {

						if (isValueLeaf(pval)) {

							prev.push({

								code: pkey,

								value: pval.value as number | string,

							});

						}

					}

					byObject.set(id, prev);

				}

			}

		}

	};



	walk(result);

	return byObject;

}



/** @deprecated Используйте {@link extractCalculationValueUpdates}. */

export function extractCalculationPropertyUpdates(

	result: unknown,

): Map<number, AnyRec> {

	const legacy = new Map<number, AnyRec>();

	for (const [id, updates] of extractCalculationValueUpdates(result)) {

		const patch: AnyRec = {};

		for (const { code, value } of updates) {

			applyCalculationValue(patch, code, value);

		}

		legacy.set(id, patch);

	}

	return legacy;

}



/**

 * Подставляет расчётные свойства в `backendProperties` объектов редактора.

 */

export function applyCalculationResultsToObjects(

	objects: GraphicObjectDto<ObjectBaseData>[],

	result: unknown,

): { objects: GraphicObjectDto<ObjectBaseData>[]; updatedCount: number } {

	const updates = extractCalculationValueUpdates(result);

	if (!updates.size) {

		return { objects, updatedCount: 0 };

	}



	let updatedCount = 0;

	const next = objects.map((dto) => {

		const list =

			updates.get(dto.id) ??

			(dto.data?.techObjectId != null

				? updates.get(dto.data.techObjectId)

				: undefined);

		if (!list?.length) return dto;



		if (!dto.data) dto.data = { techObjectId: dto.id };

		const props = (dto.data.backendProperties ?? {}) as AnyRec;



		for (const { code, value } of list) {

			applyCalculationValue(props, code, value);

		}

		removeStrayDuplicatePropertyKeys(props);

		updatedCount++;

		return {

			...dto,

			data: {

				...dto.data,

				backendProperties: props,

			},

		};

	});



	return { objects: next, updatedCount };

}


