/**
 * Заглушка БД метамодели (по документу «вариант 2.pdf»): структуры таблиц `images`,
 * `units`, `object_types`, `type_parameters` и связи между ними.
 * В продакшене данные приходят с сервера; здесь — константы для панели и drag-and-drop.
 */

import type { ObjectType } from "../../../packages/core/src/model/schema/types";

/** Таблица `images` — иконки типов объектов. */
export type MetamodelImage = {
	id: string;
	file_name: string;
	file_path: string;
	mime_type: string;
	file_size: number;
	width: number | null;
	height: number | null;
	usage_type: string;
	uploaded_at: string | null;
};

/** Таблица `units` — единицы измерения. */
export type MetamodelUnit = {
	id: string;
	code: string;
	name: string;
	symbol: string;
	dimension: string;
	si_unit_id: string | null;
	conversion_factor: number;
	is_base: boolean;
};

/** Таблица `object_types` — типы технологических объектов. */
export type MetamodelObjectType = {
	id: string;
	code: string;
	name: string;
	description: string | null;
	category: string | null;
	parent_id: string | null;
	icon_id: string | null;
	is_abstract: boolean;
	/** Для палитры: как рисовать в редакторе (pointer / linear). */
	graphObjectType: ObjectType;
};

/** Таблица `type_parameters` — параметры типа (упрощённо). */
export type MetamodelTypeParameter = {
	id: string;
	object_type_id: string | null;
	code: string;
	name: string;
	data_type: string;
	unit_id: string | null;
	default_value: string | null;
	is_required: boolean;
	display_order: number;
};

/** UUID иконок (связь `object_types.icon_id` → `images.id`). */
export const MM_IMAGES: MetamodelImage[] = [
	{
		id: "img-11111111-1111-4111-8111-111111111101",
		file_name: "supplier_icon.svg",
		file_path: "/images/supplier_icon.svg",
		mime_type: "image/svg+xml",
		file_size: 1200,
		width: 48,
		height: 48,
		usage_type: "icon",
		uploaded_at: "2026-04-29 10:30:00",
	},
	{
		id: "img-11111111-1111-4111-8111-111111111102",
		file_name: "consumer_icon.svg",
		file_path: "/images/consumer_icon.svg",
		mime_type: "image/svg+xml",
		file_size: 1180,
		width: 56,
		height: 56,
		usage_type: "icon",
		uploaded_at: "2026-04-29 10:30:00",
	},
	{
		id: "img-11111111-1111-4111-8111-111111111103",
		file_name: "pipe_icon.svg",
		file_path: "/images/pipe_icon.svg",
		mime_type: "image/svg+xml",
		file_size: 2450,
		width: 64,
		height: 64,
		usage_type: "icon",
		uploaded_at: "2026-04-29 10:30:00",
	},
	{
		id: "img-11111111-1111-4111-8111-111111111104",
		file_name: "gate_valve_icon.svg",
		file_path: "/images/gate_valve_icon.svg",
		mime_type: "image/svg+xml",
		file_size: 980,
		width: 64,
		height: 64,
		usage_type: "icon",
		uploaded_at: "2026-04-29 10:30:00",
	},
];

export const MM_UNITS: MetamodelUnit[] = [
	{
		id: "u-22222222-2222-4222-8222-222222222201",
		code: "mm",
		name: "Миллиметр",
		symbol: "мм",
		dimension: "length",
		si_unit_id: "u-22222222-2222-4222-8222-222222222200",
		conversion_factor: 0.001,
		is_base: false,
	},
	{
		id: "u-22222222-2222-4222-8222-222222222200",
		code: "m",
		name: "Метр",
		symbol: "м",
		dimension: "length",
		si_unit_id: null,
		conversion_factor: 1,
		is_base: true,
	},
];

/** Типы для палитры: код совпадает с `featureObjectType` в редакторе. */
export const MM_OBJECT_TYPES: MetamodelObjectType[] = [
	{
		id: "t-33333333-3333-4333-8333-333333333301",
		code: "supplier",
		name: "Поставщик",
		description: "Узел подачи / источник среды на схеме.",
		category: "pipeline",
		parent_id: null,
		icon_id: "img-11111111-1111-4111-8111-111111111101",
		is_abstract: false,
		graphObjectType: "pointer",
	},
	{
		id: "t-33333333-3333-4333-8333-333333333302",
		code: "consumer",
		name: "Потребитель",
		description: "Узел отбора / приём среды на схеме.",
		category: "pipeline",
		parent_id: null,
		icon_id: "img-11111111-1111-4111-8111-111111111102",
		is_abstract: false,
		graphObjectType: "pointer",
	},
	{
		id: "t-33333333-3333-4333-8333-333333333303",
		code: "pipe",
		name: "Труба",
		description: "Прямой участок трубопровода.",
		category: "pipeline",
		parent_id: null,
		icon_id: "img-11111111-1111-4111-8111-111111111103",
		is_abstract: false,
		graphObjectType: "linear",
	},
	{
		id: "t-33333333-3333-4333-8333-333333333304",
		code: "gate_valve",
		name: "Задвижка",
		description: "Запорная арматура (задвижка).",
		category: "pipeline",
		parent_id: null,
		icon_id: "img-11111111-1111-4111-8111-111111111104",
		is_abstract: false,
		graphObjectType: "pointer",
	},
];

export const MM_TYPE_PARAMETERS: MetamodelTypeParameter[] = [
	{
		id: "p-44444444-4444-4444-8444-444444444301",
		object_type_id: "t-33333333-3333-4333-8333-333333333303",
		code: "nominal_diameter",
		name: "Условный диаметр",
		data_type: "number",
		unit_id: "u-22222222-2222-4222-8222-222222222201",
		default_value: "530",
		is_required: false,
		display_order: 1,
	},
	{
		id: "p-44444444-4444-4444-8444-444444444302",
		object_type_id: "t-33333333-3333-4333-8333-333333333304",
		code: "dn",
		name: "DN",
		data_type: "number",
		unit_id: "u-22222222-2222-4222-8222-222222222201",
		default_value: "100",
		is_required: true,
		display_order: 1,
	},
];

/** Полезная нагрузка HTML5 DnD с панели на схему. */
export type MetamodelDragPayload = {
	objectTypeId: string;
	code: string;
	name: string;
	graphObjectType: ObjectType;
};

export const MM_DRAG_MIME = "application/x-graphical-editor-metamodel";

export function getMetamodelObjectTypeByCode(
	code: string,
): MetamodelObjectType | undefined {
	return MM_OBJECT_TYPES.find((t) => t.code === code);
}

/** Элементы левой панели (порядок отображения). */
export function getToolboxPaletteItems(): MetamodelObjectType[] {
	return [...MM_OBJECT_TYPES];
}

export function parseMetamodelDragPayload(
	raw: string | undefined,
): MetamodelDragPayload | null {
	if (!raw) return null;
	try {
		const v = JSON.parse(raw) as MetamodelDragPayload;
		if (!v?.objectTypeId || !v?.code || !v?.graphObjectType) return null;
		const t = getMetamodelObjectTypeByCode(v.code);
		if (!t || t.id !== v.objectTypeId) return null;
		return v;
	} catch {
		return null;
	}
}
