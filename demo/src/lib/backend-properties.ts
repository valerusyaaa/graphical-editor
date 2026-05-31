import { formatReadOnlyPropertyValue } from "./numeric-format";

export type PropertyPath = string[];

export type PropertyFieldRow = {
	kind: "field";
	path: PropertyPath;
	label: string;
	value: string;
	readOnly: boolean;
	/** Выпадающий список True/False для «Фиксировать на схеме». */
	fieldType?: "text" | "boolean" | "int" | "valveState";
};

const INT_PROPERTY_KEYS = new Set(["Диаметр_ЛК"]);
const VALVE_STATE_KEY = "Состояние";

export type PropertySectionNode = {
	kind: "section";
	key: string;
	title: string;
	readOnly: boolean;
	children: PropertyTreeNode[];
};

export type PropertyTreeNode = PropertySectionNode | PropertyFieldRow;

const SECTION_TITLES: Record<string, string> = {
	Design: "Оформление",
	Inner: "Служебные",
	Results: "Результаты",
	"Данные регистрации": "Данные регистрации",
	"Компонентный состав газa": "Компонентный состав газа",
	"Состав газa": "Состав газа",
	Замер: "Замер",
	Замеры: "Замеры",
	"Параметры скважины": "Параметры скважины",
};

const READ_ONLY_ROOT_KEYS = new Set(["Results"]);

/** Переопределение подписей полей: ключ данных уникален, но в панели показываем иначе. */
const FIELD_LABEL_OVERRIDES: Record<string, string> = {
	"P::Result": "P",
	"Q::Result": "Q",
	"T::Result": "T",
	"Pвх::Result": "Pвх",
	"Pвых::Result": "Pвых",
	"Qвх::Result": "Qвх",
	"Qвых::Result": "Qвых",
	"Tвх::Result": "Tвх",
	"Tвых::Result": "Tвых",
};

function isRecord(v: unknown): v is Record<string, unknown> {
	return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isValueLeaf(node: unknown): node is { value: string } {
	return (
		isRecord(node) &&
		"value" in node &&
		(typeof node.value === "string" || typeof node.value === "number")
	);
}

export function sectionTitle(key: string): string {
	return SECTION_TITLES[key] ?? key;
}

export function buildPropertyTree(
	properties: Record<string, unknown> | undefined,
	parentReadOnly = false,
	pathPrefix: PropertyPath = [],
): PropertyTreeNode[] {
	if (!properties || !isRecord(properties)) return [];
	const nodes: PropertyTreeNode[] = [];

	for (const key of Object.keys(properties)) {
		const node = properties[key];
		const path = [...pathPrefix, key];
		const rootKey = pathPrefix[0] ?? key;
		const readOnly =
			parentReadOnly || READ_ONLY_ROOT_KEYS.has(rootKey) || key === "Results";

		if (isValueLeaf(node)) {
			const raw = String(node.value ?? "");
			const isBoolean = key === "Фиксировать на схеме";
			const isInt = INT_PROPERTY_KEYS.has(key);
			const isValveState =
				key === VALVE_STATE_KEY && path.length === 1;
			nodes.push({
				kind: "field",
				path,
				label: FIELD_LABEL_OVERRIDES[key] ?? key,
				value: isBoolean
					? raw === "True"
						? "True"
						: "False"
					: isValveState
						? raw === "1"
							? "1"
							: "0"
						: isInt
							? String(parseInt(raw, 10) || 0)
							: readOnly
								? formatReadOnlyPropertyValue(raw)
								: raw,
				readOnly,
				fieldType: isBoolean
					? "boolean"
					: isValveState
						? "valveState"
						: isInt
							? "int"
							: "text",
			});
			continue;
		}

		if (isRecord(node)) {
			const children = buildPropertyTree(node, readOnly, path);
			if (children.length === 0) continue;
			nodes.push({
				kind: "section",
				key: path.join("."),
				title: sectionTitle(key),
				readOnly,
				children,
			});
		}
	}

	return nodes;
}

export function getPropertyValue(
	properties: Record<string, unknown>,
	path: PropertyPath,
): string {
	let cur: unknown = properties;
	for (const seg of path) {
		if (!isRecord(cur)) return "";
		cur = cur[seg];
	}
	if (isValueLeaf(cur)) return String(cur.value ?? "");
	return "";
}

export function sanitizePropertyValue(path: PropertyPath, value: string): string {
	const key = path[path.length - 1];
	if (key === VALVE_STATE_KEY && path.length === 1) {
		return value === "1" ? "1" : "0";
	}
	if (key && INT_PROPERTY_KEYS.has(key)) {
		const n = parseInt(value, 10);
		return String(Number.isFinite(n) ? n : 0);
	}
	return value;
}

export function setPropertyValue(
	properties: Record<string, unknown>,
	path: PropertyPath,
	value: string,
): void {
	if (!path.length) return;
	value = sanitizePropertyValue(path, value);
	let cur: Record<string, unknown> = properties;
	for (let i = 0; i < path.length - 1; i++) {
		const seg = path[i]!;
		const next = cur[seg];
		if (!isRecord(next)) {
			cur[seg] = {};
		}
		cur = cur[seg] as Record<string, unknown>;
	}
	const leafKey = path[path.length - 1]!;
	const leaf = cur[leafKey];
	if (isValueLeaf(leaf)) {
		leaf.value = value;
	} else {
		cur[leafKey] = { value };
	}
}

export function mergeRegistrationId(
	properties: Record<string, unknown>,
	title: string,
): void {
	const dr = properties["Данные регистрации"];
	if (!isRecord(dr)) return;
	const idNode = dr.id;
	if (isValueLeaf(idNode)) {
		idNode.value = title;
	}
}
