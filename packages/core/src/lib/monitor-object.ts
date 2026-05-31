import type { GraphicObjectDto, ObjectBaseData } from "../api/types";
import { readBackendProperties } from "./object-fixed-on-scheme";
import {
	featureLabelForMonitor,
	readRegistrationId,
} from "./registration-id";
import {
	canonicalFeatureType,
	isConsumerFeature,
	isMonitorFeature,
	isPipeFeature,
	isProducerFeature,
	isValveFeature,
} from "../model/schema/feature-type-aliases";

export const MONITOR_SLOT_COUNT = 10;

export type MonitorDisplayLine = {
	text: string;
	color: string;
};

/** Свойство объекта-источника, доступное для вывода на мониторе. */
export type MonitorPropertyCandidate = {
	/** Ключ для `monitorResultSlots` / `result.N` (имя листа в `properties`). */
	key: string;
	/** Подпись в UI (секция + ключ). */
	label: string;
	/** Путь секций для группировки в панели. */
	sectionPath: string;
};

const MONITOR_CANDIDATE_SKIP_SECTIONS = new Set([
	"Design",
	"Inner",
	"Данные регистрации",
	"Оформление",
	"Исходные данные",
	"Расчетные параметры",
]);

/** Яркие цвета значений на тёмном фоне схемы. */
const VALUE_COLORS_DARK = [
	"#7eb8ff",
	"#6ee7a0",
	"#f5d08a",
	"#d8b4fe",
	"#7dd3fc",
];

const VALUE_COLORS_LIGHT = [
	"#1d4ed8",
	"#15803d",
	"#b45309",
	"#7c3aed",
	"#0e7490",
];

function monitorValueColors(): string[] {
	if (typeof document === "undefined") return VALUE_COLORS_DARK;
	return document.documentElement.getAttribute("data-ge-theme") === "light"
		? VALUE_COLORS_LIGHT
		: VALUE_COLORS_DARK;
}

/** Пресеты result.1… для «Отобразить свойства». */
export const MONITOR_RESULT_PRESETS: Record<string, string[]> = {
	Producer: ["P", "Q", "T"],
	consumer: ["Pз", "Qз", "Tз"],
	Consumer: ["Pз", "Qз", "Tз"],
	Valve: ["Диаметр_ЛК", "Pвх(з)", "Tвх(з)"],
	pipe: ["Длина", "Диаметр D"],
	Pipe: ["Длина", "Диаметр D"],
};

function isRecord(v: unknown): v is Record<string, unknown> {
	return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isValueLeaf(
	node: unknown,
): node is { value: string | number } {
	return (
		isRecord(node) &&
		"value" in node &&
		(typeof node.value === "string" || typeof node.value === "number")
	);
}

function readLeaf(node: unknown): string {
	if (!isRecord(node) || !("value" in node)) return "";
	return String(node.value ?? "").trim();
}

/** Читает значение параметра источника по ключу result.N (P, Pз, P::Result, …). */
export function readSourcePropertyValue(
	properties: Record<string, unknown> | undefined,
	key: string,
): string {
	if (!properties || !key.trim()) return "";
	const rawKey = key.trim();
	if (rawKey === "id") {
		return readRegistrationId(properties);
	}

	const baseKey = rawKey.replace(/::Result$/i, "");
	const resultKey = `${baseKey}::Result`;

	const sectionValue = (section: unknown, k: string): string =>
		isRecord(section) ? readLeaf(section[k]) : "";

	// Вычисленное значение (::Result): сначала в корне, затем в секциях результатов.
	const readResultValue = (): string => {
		const fromRoot = readLeaf(properties[resultKey]);
		if (fromRoot) return fromRoot;
		for (const section of [
			properties.Results,
			properties["Замер"],
			properties["Замеры"],
		]) {
			const v =
				sectionValue(section, rawKey) || sectionValue(section, resultKey);
			if (v) return v;
		}
		return "";
	};

	// Исходное (заданное) значение: в корне, затем в любой секции.
	const readInputValue = (): string => {
		const fromRoot = readLeaf(properties[rawKey]) || readLeaf(properties[baseKey]);
		if (fromRoot) return fromRoot;
		for (const section of Object.values(properties)) {
			const v =
				sectionValue(section, rawKey) || sectionValue(section, baseKey);
			if (v) return v;
		}
		return "";
	};

	const isCalculated = (s: string): boolean => {
		const n = Number(s);
		return s !== "" && Number.isFinite(n) && n !== 0;
	};

	// После расчёта показываем вычисленный результат (ненулевой ::Result),
	// иначе — заданное значение, а в запасе — сам результат (в т.ч. нулевой/текстовый).
	const result = readResultValue();
	if (isCalculated(result)) return result;
	const input = readInputValue();
	if (input !== "") return input;
	return result;
}

export function getMonitorResultSlots(
	data: ObjectBaseData | undefined,
): string[] {
	const slots = data?.monitorResultSlots;
	if (!Array.isArray(slots)) return Array(MONITOR_SLOT_COUNT).fill("");
	const out = slots.slice(0, MONITOR_SLOT_COUNT).map((s) => String(s ?? ""));
	while (out.length < MONITOR_SLOT_COUNT) out.push("");
	return out;
}

export function setMonitorResultSlots(
	data: ObjectBaseData,
	slots: string[],
): void {
	data.monitorResultSlots = slots
		.slice(0, MONITOR_SLOT_COUNT)
		.map((s) => String(s ?? ""));
}

/** Активные (непустые) слоты в порядке отображения. */
export function getActiveMonitorSlotKeys(
	data: ObjectBaseData | undefined,
): string[] {
	return getMonitorResultSlots(data).map((s) => s.trim()).filter(Boolean);
}

/** Записывает выбранные ключи в `result.1` … `result.10`. */
export function setActiveMonitorSlotKeys(
	data: ObjectBaseData,
	selectedKeys: string[],
): void {
	const slots = Array(MONITOR_SLOT_COUNT).fill("");
	for (let i = 0; i < selectedKeys.length && i < MONITOR_SLOT_COUNT; i++) {
		slots[i] = selectedKeys[i]!.trim();
	}
	setMonitorResultSlots(data, slots);
}

function formatMonitorLineLabel(key: string): string {
	return key.replace(/::Result$/i, "").trim() || key;
}

/** Кол-во знаков после запятой для значений на мониторе. */
const MONITOR_DECIMAL_PLACES = 2;

function roundMonitorValue(value: string): string {
	const s = value.trim();
	if (!s || s === "True" || s === "False") return value;
	const n = Number(s);
	if (!Number.isFinite(n)) return value;
	return String(parseFloat(n.toFixed(MONITOR_DECIMAL_PLACES)));
}

function formatMonitorLineText(key: string, value: string): string {
	const label = formatMonitorLineLabel(key);
	const v = roundMonitorValue(value);
	return label === v ? v : `${label}: ${v}`;
}

/** Все числовые/текстовые листья `properties` источника (кроме служебных секций). */
export function listMonitorPropertyCandidates(
	properties: Record<string, unknown> | undefined,
): MonitorPropertyCandidate[] {
	if (!properties) return [];
	const byKey = new Map<string, MonitorPropertyCandidate>();

	const walk = (
		node: Record<string, unknown>,
		sectionPath: string[],
	): void => {
		for (const key of Object.keys(node)) {
			if (MONITOR_CANDIDATE_SKIP_SECTIONS.has(key)) continue;
			const child = node[key];
			if (isValueLeaf(child)) {
				if (key.toLowerCase() === "id") continue;
				const sectionPathStr = sectionPath.join(" / ");
				const label = sectionPathStr ? `${sectionPathStr} — ${key}` : key;
				if (!byKey.has(key)) {
					byKey.set(key, { key, label, sectionPath: sectionPathStr });
				}
				continue;
			}
			if (isRecord(child)) {
				walk(child, [...sectionPath, key]);
			}
		}
	};

	walk(properties, []);
	return [...byKey.values()].sort((a, b) => {
		const sa = a.sectionPath.localeCompare(b.sectionPath, "ru");
		if (sa !== 0) return sa;
		return a.key.localeCompare(b.key, "ru");
	});
}

export function getMonitorPresetForFeature(featureObjectType: string): string[] {
	const code = canonicalFeatureType(featureObjectType);
	const preset =
		MONITOR_RESULT_PRESETS[code] ??
		MONITOR_RESULT_PRESETS[featureObjectType] ??
		[];
	const slots = Array(MONITOR_SLOT_COUNT).fill("");
	for (let i = 0; i < preset.length && i < MONITOR_SLOT_COUNT; i++) {
		slots[i] = preset[i]!;
	}
	return slots;
}

export { featureLabelForMonitor } from "./registration-id";

export function buildMonitorTitle(
	source: GraphicObjectDto<ObjectBaseData>,
): string {
	const props = readBackendProperties(source.data);
	const regId = readRegistrationId(props) || String(source.id);
	return `${featureLabelForMonitor(source.featureObjectType)}: ${regId}`;
}

export function buildMonitorDisplayLines(
	monitor: GraphicObjectDto<ObjectBaseData>,
	source: GraphicObjectDto<ObjectBaseData> | undefined,
): MonitorDisplayLine[] {
	const sourceProps = readBackendProperties(source?.data);
	const slots = getMonitorResultSlots(monitor.data);
	const lines: MonitorDisplayLine[] = [];
	let colorIdx = 0;

	for (const key of slots) {
		const slotKey = key.trim();
		if (!slotKey) continue;
		// id уже в заголовке («Кран: Кран 2»), не дублируем синей строкой
		if (slotKey.toLowerCase() === "id") continue;
		const value = source
			? readSourcePropertyValue(sourceProps, slotKey)
			: "";
		if (value === "") continue;
		const palette = monitorValueColors();
		lines.push({
			text: formatMonitorLineText(slotKey, value),
			color: palette[colorIdx % palette.length]!,
		});
		colorIdx++;
	}

	return lines;
}

export function getMonitorCaption(
	monitor: GraphicObjectDto<ObjectBaseData>,
): string {
	const props = readBackendProperties(monitor.data);
	return readLeaf(props.id) || "Монитор";
}

/** Обновляет `monitorDisplayLines` у всех мониторов в списке. */
export function syncMonitorsInObjectList(
	objects: GraphicObjectDto<ObjectBaseData>[],
): void {
	for (const obj of objects) {
		if (!isMonitorFeature(obj.featureObjectType)) continue;
		if (!obj.data) obj.data = { techObjectId: obj.id };
		obj.data.monitorDisplayLines = buildMonitorDisplayLines(
			obj,
			objects.find((o) => o.id === obj.data?.monitorSourceId),
		);
	}
}

export function findMonitorForSource(
	objects: GraphicObjectDto<ObjectBaseData>[],
	sourceId: number,
): GraphicObjectDto<ObjectBaseData> | undefined {
	return objects.find(
		(o) =>
			isMonitorFeature(o.featureObjectType) &&
			o.data?.monitorSourceId === sourceId,
	);
}

export function objectAnchorPosition(
	dto: GraphicObjectDto<ObjectBaseData>,
): { x: number; y: number } {
	if (dto.position) return { x: dto.position.x, y: dto.position.y };
	const pts = dto.points;
	if (pts && pts.length >= 1) {
		let sx = 0;
		let sy = 0;
		for (const p of pts) {
			sx += p.x;
			sy += p.y;
		}
		return { x: sx / pts.length, y: sy / pts.length };
	}
	return { x: 0, y: 0 };
}

export function createDefaultMonitorBackendProperties(
	title: string,
): Record<string, unknown> {
	return {
		id: { value: title },
		Замеры: {},
		"Исходные данные": {},
		Оформление: {
			bgcolor: { value: "#ebf0ff" },
			color: { value: "#000000" },
			font: {
				value: "Helvetica,12,-1,5,400,0,0,0,0,0,0,0,0,0,0,1",
			},
			transparent: { value: "True" },
		},
		"Расчетные параметры": {},
	};
}

export function canAttachMonitorToFeature(featureObjectType: string): boolean {
	const code = canonicalFeatureType(featureObjectType);
	return (
		isProducerFeature(code) ||
		isConsumerFeature(code) ||
		isValveFeature(code) ||
		isPipeFeature(code)
	);
}
