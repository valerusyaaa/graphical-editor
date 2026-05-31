import { CANONICAL_FEATURE } from "../../../packages/core/src/model/schema/feature-type-aliases";

import { setValveOpenInProperties } from "../../../packages/core/src/lib/valve-state";

import { BACKEND_OBJECT_CLASS } from "./backend-scheme-export";
import schemeReference from "../../public/scheme-reference.json";



type AnyRec = Record<string, unknown>;



const FEATURE_TO_BACKEND_CLASS: Record<string, string> = {

	[CANONICAL_FEATURE.Producer]: BACKEND_OBJECT_CLASS.Producer,

	[CANONICAL_FEATURE.Consumer]: BACKEND_OBJECT_CLASS.Consumer,

	[CANONICAL_FEATURE.Pipe]: BACKEND_OBJECT_CLASS.Pipe,

	[CANONICAL_FEATURE.Valve]: BACKEND_OBJECT_CLASS.Valve,

	[CANONICAL_FEATURE.Monitor]: "Monitor",

	supplier: BACKEND_OBJECT_CLASS.Producer,

	gate_valve: BACKEND_OBJECT_CLASS.Valve,

};



const BACKEND_CLASS_ALIASES: Record<string, string[]> = {

	Producer: ["Producer"],

	Consumer: ["Consumer"],

	Pipe: ["Pipe"],

	Schema: ["Schema"],

	Valve: ["Valve"],

	GateValve: ["Valve"],

	Monitor: ["Monitor"],

	In: ["Producer"],

	Out: ["Consumer"],

};



function registerClassTemplate(

	byClass: Map<string, AnyRec>,

	cls: string,

	props: AnyRec,

): void {

	const clone = deepClone(props);

	byClass.set(cls, clone);

	for (const alias of BACKEND_CLASS_ALIASES[cls] ?? [cls]) {

		if (!byClass.has(alias)) byClass.set(alias, deepClone(props));

	}

}



let cache: {

	byClass: Map<string, AnyRec>;

	schema: AnyRec;

} | null = null;



function deepClone<T>(v: T): T {

	return JSON.parse(JSON.stringify(v)) as T;

}



function isRecord(v: unknown): v is AnyRec {

	return typeof v === "object" && v !== null && !Array.isArray(v);

}



function isValueLeaf(v: unknown): v is { value: string | number } {

	return (

		isRecord(v) &&

		"value" in v &&

		(typeof v.value === "string" || typeof v.value === "number")

	);

}



/** В шаблоне Results могут быть с расчёта — для новых объектов обнуляем. */

function resetResultsSectionForNewObject(props: AnyRec): void {

	const results = props.Results ?? props.results;

	if (!isRecord(results)) return;

	for (const key of Object.keys(results)) {

		const leaf = results[key];

		if (isValueLeaf(leaf)) leaf.value = "0";

	}

}



function buildCacheFromReference(raw: AnyRec): typeof cache {
	const objects = Array.isArray(raw.objects) ? raw.objects : [];

	const byClass = new Map<string, AnyRec>();

	for (const o of objects) {

		if (!o || typeof o !== "object") continue;

		const rec = o as AnyRec;

		const cls = String(rec.class ?? "");

		const props = rec.properties;

		if (cls && props && typeof props === "object") {

			registerClassTemplate(byClass, cls, props as AnyRec);

		}

	}

	const schemaObj = objects.find(

		(o) => o && typeof o === "object" && (o as AnyRec).class === "Schema",

	) as AnyRec | undefined;

	return {

		byClass,

		schema: schemaObj?.properties

			? deepClone(schemaObj.properties as AnyRec)

			: {},

	};

}

async function loadReference(): Promise<typeof cache> {

	if (cache) return cache;

	/** Встроенный JSON — всегда доступен; fetch только как обновление при dev-сервере. */
	cache = buildCacheFromReference(schemeReference as AnyRec);

	const base = import.meta.env.BASE_URL.replace(/\/$/, "") || "";

	try {

		const res = await fetch(`${base}/scheme-reference.json`);

		if (res.ok) {

			const raw = (await res.json()) as AnyRec;

			cache = buildCacheFromReference(raw);

		}

	} catch {

		/* оставляем встроенный шаблон */

	}

	return cache;

}



export async function ensurePropertyTemplatesLoaded(): Promise<void> {

	await loadReference();

}



function getTemplateByBackendClass(backendClass: string): AnyRec | null {

	if (!cache) return null;

	const keys = BACKEND_CLASS_ALIASES[backendClass] ?? [backendClass];

	for (const key of keys) {

		const tpl = cache.byClass.get(key);

		if (tpl) return tpl;

	}

	return null;

}



/** Шаблон `properties` по классу из scheme-reference.json. */

export function getDefaultPropertiesForBackendClass(

	backendClass: string,

): AnyRec {

	const tpl = getTemplateByBackendClass(backendClass);

	if (!tpl) return {};

	const out = deepClone(tpl);

	resetResultsSectionForNewObject(out);

	if (

		backendClass === BACKEND_OBJECT_CLASS.Valve ||

		(BACKEND_CLASS_ALIASES.Valve ?? []).includes(backendClass)

	) {

		setValveOpenInProperties(out, true);

	}

	return out;

}



export function getDefaultPropertiesForFeature(

	featureObjectType: string,

): AnyRec {

	const cls = FEATURE_TO_BACKEND_CLASS[featureObjectType];

	if (!cls) return {};

	return getDefaultPropertiesForBackendClass(cls);

}



/** Добавляет в объект отсутствующие корневые свойства из шаблона. */

export function mergeMissingPropertyDefaults(

	target: Record<string, unknown>,

	defaults: Record<string, unknown>,

): void {

	for (const [key, val] of Object.entries(defaults)) {

		if (!(key in target)) {

			target[key] = deepClone(val);

		}

	}

}



export function getDefaultSchemaProperties(): AnyRec {

	if (!cache) return {};

	return deepClone(cache.schema);

}



export function backendClassForFeature(featureObjectType: string): string | null {

	return FEATURE_TO_BACKEND_CLASS[featureObjectType] ?? null;

}

/** Старые секции замеров, которые переносятся в Results и удаляются. */
const LEGACY_MEASUREMENT_SECTIONS = ["Замер", "Замеры"];
const PRIZNAK_PQ_KEY = "Признак P,Q (р)";

/** Старые ключи замеров → backend-коды результатов (`::Result`). */
const LEGACY_KEY_RENAMES: Record<string, string> = {
	"Pз": "P::Result",
	"Qз": "Q::Result",
	"Tз": "T::Result",
	"Pвх(з)": "Pвх::Result",
	"Pвых(з)": "Pвых::Result",
	"Tвх(з)": "Tвх::Result",
	"Tвых(з)": "Tвых::Result",
};

/**
 * Приводит свойства объекта к актуальной раскладке:
 * - поля из секций «Замер»/«Замеры» переносятся в `Results`, сами секции удаляются;
 * - «Признак P,Q (р)» ставится сразу после `Q` (рядом с заданными P и Q).
 * Идемпотентна: повторный вызов на уже нормализованных свойствах ничего не меняет.
 * Возвращает true, если что-то изменилось.
 */
export function normalizeBackendPropertiesLayout(props: AnyRec): boolean {
	if (!isRecord(props)) return false;
	let changed = false;

	for (const sectionKey of LEGACY_MEASUREMENT_SECTIONS) {
		const section = props[sectionKey];
		if (!isRecord(section) || isValueLeaf(section)) continue;

		const entries = Object.entries(section);
		if (entries.length) {
			let results = props.Results;
			if (!isRecord(results) || isValueLeaf(results)) {
				results = {};
				props.Results = results;
			}
			const res = results as AnyRec;
			for (const [key, val] of entries) {
				const targetKey = LEGACY_KEY_RENAMES[key] ?? key;
				if (!(targetKey in res)) res[targetKey] = val;
			}
		}
		delete props[sectionKey];
		changed = true;
	}

	// Переименование старых ключей, уже лежащих в Results.
	const resultsForRename = props.Results;
	if (isRecord(resultsForRename) && !isValueLeaf(resultsForRename)) {
		const res = resultsForRename as AnyRec;
		for (const [legacyKey, newKey] of Object.entries(LEGACY_KEY_RENAMES)) {
			if (!(legacyKey in res)) continue;
			if (!(newKey in res)) res[newKey] = res[legacyKey];
			delete res[legacyKey];
			changed = true;
		}
	}

	if (PRIZNAK_PQ_KEY in props) {
		const keys = Object.keys(props);
		const ordered: string[] = [];
		if (!keys.includes("Q")) ordered.push(PRIZNAK_PQ_KEY);
		for (const key of keys) {
			if (key === PRIZNAK_PQ_KEY) continue;
			ordered.push(key);
			if (key === "Q") ordered.push(PRIZNAK_PQ_KEY);
		}
		const sameOrder =
			ordered.length === keys.length &&
			keys.every((key, i) => key === ordered[i]);
		if (!sameOrder) {
			const snapshot: AnyRec = {};
			for (const key of ordered) snapshot[key] = props[key];
			for (const key of Object.keys(props)) delete props[key];
			for (const key of ordered) props[key] = snapshot[key];
			changed = true;
		}
	}

	return changed;
}


