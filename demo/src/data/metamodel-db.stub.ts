/**

 * Метамодель: загрузка из `public/metamodel_main.json` (экспорт ветки main).

 * Монитор — только в редакторе, в метамодели нет.

 */



import type { ObjectType } from "../../../packages/core/src/model/schema/types";

import {
	CANONICAL_FEATURE,
	canonicalFeatureType,
} from "../../../packages/core/src/model/schema/feature-type-aliases";

import type { MetamodelExportBundle } from "../lib/metamodel-parse";

import {

	isPaletteMetamodelType,

	sortPaletteTypes,

} from "../lib/metamodel-parse";



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



export type MetamodelObjectType = {

	id: string;

	code: string;

	name: string;

	description: string | null;

	category: string | null;

	parent_id: string | null;

	icon_id: string | null;

	is_abstract: boolean;

	graphObjectType: ObjectType;

	/** Канонический код для `ObjectDescription` / EditedJSON. */

	editorFeature: string;

	schemaClass?: string;

};



export type MetamodelTypeParameter = {

	id: string;

	object_type_id: string;

	code: string;

	name: string;

	data_type: string;

	unit_id: string | null;

	default_value: string | null;

	min_value: number | null;

	max_value: number | null;

	is_required: boolean;

	display_order: number;

	composite_parameter_id: string | null;

	is_composite_root: boolean;

};



/** Монитор — визуализация на схеме, не из метамодели. */

const EDITOR_MONITOR_TYPE: MetamodelObjectType = {

	id: "editor-monitor-local",

	code: "Monitor",

	name: "Монитор",

	description: "Отображение свойств экземпляра на схеме",

	category: "editor",

	parent_id: null,

	icon_id: null,

	is_abstract: false,

	graphObjectType: "pointer",

	editorFeature: CANONICAL_FEATURE.Monitor,

	schemaClass: "Monitor",

};



let loadedBundle: MetamodelExportBundle | null = null;



export function setMetamodelExportBundle(

	bundle: MetamodelExportBundle | null,

): void {

	loadedBundle = bundle;

}



export function getMetamodelExportBundle(): MetamodelExportBundle | null {

	return loadedBundle;

}



function allObjectTypes(): MetamodelObjectType[] {

	const fromMm = loadedBundle?.objectTypes ?? [];

	return [...fromMm, EDITOR_MONITOR_TYPE];

}



export function getMetamodelTypeParameters(

	objectTypeId?: string,

): MetamodelTypeParameter[] {

	const params = loadedBundle?.typeParameters ?? [];

	if (!objectTypeId) return params;

	return params.filter((p) => p.object_type_id === objectTypeId);

}



export function getMetamodelUnits(): MetamodelUnit[] {

	return loadedBundle?.units ?? [];

}



export function getMetamodelObjectTypeById(

	id: string,

): MetamodelObjectType | undefined {

	return allObjectTypes().find((t) => t.id === id);

}



export function getMetamodelObjectTypeByCode(

	code: string,

): MetamodelObjectType | undefined {

	const want = canonicalFeatureType(code);

	return allObjectTypes().find(

		(t) =>

			t.code === code ||

			canonicalFeatureType(t.code) === want ||

			t.editorFeature === want,

	);

}



/** Полезная нагрузка HTML5 DnD с панели на схему. */

export type MetamodelDragPayload = {

	objectTypeId: string;

	code: string;

	name: string;

	graphObjectType: ObjectType;

};



export const MM_DRAG_MIME = "application/x-graphical-editor-metamodel";



/** Элементы левой панели (порядок отображения). */

export function getToolboxPaletteItems(): MetamodelObjectType[] {

	const palette = allObjectTypes().filter(

		(t) => t.code === "Monitor" || isPaletteMetamodelType(t),

	);

	return sortPaletteTypes(palette.filter((t) => t.code !== "Monitor")).concat(

		EDITOR_MONITOR_TYPE,

	);

}



export function parseMetamodelDragPayload(

	raw: string | undefined,

): MetamodelDragPayload | null {

	if (!raw) return null;

	try {

		const v = JSON.parse(raw) as MetamodelDragPayload;

		if (!v?.objectTypeId || !v?.code || !v?.graphObjectType) return null;

		const t = getMetamodelObjectTypeById(v.objectTypeId);

		if (!t || t.code !== v.code) return null;

		return v;

	} catch {

		return null;

	}

}



/** @deprecated Используйте `setMetamodelExportBundle`. */

export function setMetamodelToolboxTypesOverride(

	types: MetamodelObjectType[] | null,

): void {

	if (!types?.length) {

		setMetamodelExportBundle(null);

		return;

	}

	setMetamodelExportBundle({

		objectTypes: types.filter((t) => t.code !== "Monitor"),

		typeParameters: loadedBundle?.typeParameters ?? [],

		units: loadedBundle?.units ?? [],

	});

}


