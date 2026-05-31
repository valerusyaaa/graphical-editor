import type { GraphicObjectDto, ObjectBaseData } from "../api/types";
import {
	isPipeFeature,
	isValveFeature,
} from "../model/schema/feature-type-aliases";

/** id объекта в data-service (`GET /objects`). */
export const CHART_DATA_PIPE_ID = 6;
export const CHART_DATA_VALVE_IDS = [1, 2, 3, 4, 5] as const;

export type ChartOpenItem = {
	/** id для API графиков (1…5 краны, 6 труба). */
	chartObjectId: number;
	chartKind: "profiles" | "trends";
	title: string;
	schemeObjectId: number;
};

function ensureData(
	dto: GraphicObjectDto<ObjectBaseData>,
): ObjectBaseData {
	if (!dto.data) dto.data = { techObjectId: dto.id };
	return dto.data;
}

/** Стабильно привязывает краны 1…5 и трубу 6 к синтетическим данным data-service. */
export function ensureChartObjectIds(
	objects: GraphicObjectDto<ObjectBaseData>[],
): void {
	const valves = objects
		.filter((o) => isValveFeature(o.featureObjectType))
		.sort((a, b) => a.id - b.id);
	const pipes = objects
		.filter((o) => isPipeFeature(o.featureObjectType))
		.sort((a, b) => a.id - b.id);

	for (let i = 0; i < valves.length; i++) {
		const v = valves[i]!;
		const data = ensureData(v);
		data.chartObjectId = CHART_DATA_VALVE_IDS[i % CHART_DATA_VALVE_IDS.length]!;
	}

	for (const p of pipes) {
		const data = ensureData(p);
		data.chartObjectId = CHART_DATA_PIPE_ID;
	}
}

export function isChartableSchemeObject(
	dto: GraphicObjectDto<ObjectBaseData>,
): boolean {
	return (
		isValveFeature(dto.featureObjectType) ||
		isPipeFeature(dto.featureObjectType)
	);
}

export function resolveChartObjectId(
	dto: GraphicObjectDto<ObjectBaseData>,
	objects: GraphicObjectDto<ObjectBaseData>[],
): number | null {
	if (!isChartableSchemeObject(dto)) return null;
	ensureChartObjectIds(objects);
	const id = dto.data?.chartObjectId;
	return typeof id === "number" && id > 0 ? id : null;
}

const CHART_NAMES: Record<number, string> = {
	1: "Кран №1",
	2: "Кран №2",
	3: "Кран №3",
	4: "Кран №4",
	5: "Кран №5",
	6: "Труба №1",
};

export function chartDisplayName(chartObjectId: number): string {
	return CHART_NAMES[chartObjectId] ?? `Объект ${chartObjectId}`;
}

export function buildChartOpenItems(
	objects: GraphicObjectDto<ObjectBaseData>[],
	schemeObjectIds: number[],
): ChartOpenItem[] {
	ensureChartObjectIds(objects);
	const items: ChartOpenItem[] = [];
	const seen = new Set<string>();

	for (const schemeId of schemeObjectIds) {
		const dto = objects.find((o) => o.id === schemeId);
		if (!dto || !isChartableSchemeObject(dto)) continue;
		const chartObjectId = resolveChartObjectId(dto, objects);
		if (chartObjectId == null) continue;
		const chartKind = isPipeFeature(dto.featureObjectType)
			? "profiles"
			: "profiles";
		const suffix = chartKind === "profiles" ? "Профиль" : "Тренд";
		const name = chartDisplayName(chartObjectId);
		const key = `${chartObjectId}:${chartKind}`;
		if (seen.has(key)) continue;
		seen.add(key);
		items.push({
			chartObjectId,
			chartKind,
			title: `${name} · ${suffix}`,
			schemeObjectId: schemeId,
		});
	}
	return items;
}
