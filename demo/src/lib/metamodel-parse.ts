import type { ObjectType } from "../../../packages/core/src/model/schema/types";
import {
	CANONICAL_FEATURE,
	canonicalFeatureType,
} from "../../../packages/core/src/model/schema/feature-type-aliases";
import type {
	MetamodelObjectType,
	MetamodelTypeParameter,
	MetamodelUnit,
} from "../data/metamodel-db.stub";

/** Привязка типа метамодели к редактору и EditedJSON. */
export type MetamodelEditorBinding = {
	editorFeature: string;
	graphObjectType: ObjectType;
	schemaClass: string;
	/** Абстрактный тип всё равно в палитре (PROVIDER, CONSUMER). */
	paletteDespiteAbstract?: boolean;
	paletteOrder: number;
};

const BINDINGS: Record<string, MetamodelEditorBinding> = {
	PROVIDER: {
		editorFeature: CANONICAL_FEATURE.Producer,
		graphObjectType: "pointer",
		schemaClass: "Producer",
		paletteDespiteAbstract: true,
		paletteOrder: 10,
	},
	CONSUMER: {
		editorFeature: CANONICAL_FEATURE.Consumer,
		graphObjectType: "pointer",
		schemaClass: "Consumer",
		paletteDespiteAbstract: true,
		paletteOrder: 20,
	},
	"PIPE-MAIN-001": {
		editorFeature: CANONICAL_FEATURE.Pipe,
		graphObjectType: "linear",
		schemaClass: "Pipe",
		paletteOrder: 30,
	},
	VALVE: {
		editorFeature: CANONICAL_FEATURE.Valve,
		graphObjectType: "pointer",
		schemaClass: "Valve",
		paletteOrder: 40,
	},
};

export type MetamodelExportBundle = {
	version?: string;
	branchId?: string;
	branchName?: string;
	objectTypes: MetamodelObjectType[];
	typeParameters: MetamodelTypeParameter[];
	units: MetamodelUnit[];
};

function isObject(v: unknown): v is Record<string, unknown> {
	return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function getMetamodelEditorBinding(
	code: string,
): MetamodelEditorBinding | undefined {
	return BINDINGS[code.trim().toUpperCase()] ?? BINDINGS[code.trim()];
}

export function inferGraphObjectTypeFromMetamodelRow(
	row: Record<string, unknown>,
	code: string,
): ObjectType {
	const binding = getMetamodelEditorBinding(code);
	if (binding) return binding.graphObjectType;
	const category = String(row.category ?? row.Category ?? "")
		.trim()
		.toLowerCase();
	if (category === "pipe") return "linear";
	if (category === "valve") return "pointer";
	const goRaw =
		row.graphObjectType ?? row.graph_object_type ?? row.GraphObjectType;
	if (goRaw === "linear") return "linear";
	return "pointer";
}

export function mapMetamodelObjectTypeRow(
	row: unknown,
): MetamodelObjectType | null {
	if (!isObject(row)) return null;
	const id = String(row.id ?? row.Id ?? "").trim();
	const code = String(row.code ?? row.Code ?? "").trim();
	const name = String(row.name ?? row.Name ?? "").trim();
	if (!id || !code || !name) return null;

	const binding = getMetamodelEditorBinding(code);
	const abstractRaw = row.is_abstract ?? row.isAbstract ?? row.IsAbstract;

	return {
		id,
		code,
		name,
		description:
			row.description != null || row.Description != null
				? String(row.description ?? row.Description)
				: null,
		category:
			row.category != null || row.Category != null
				? String(row.category ?? row.Category)
				: null,
		parent_id:
			row.parent_id != null ||
			row.parentId != null ||
			row.ParentId != null
				? String(row.parent_id ?? row.parentId ?? row.ParentId)
				: null,
		icon_id:
			row.icon_id != null || row.iconId != null || row.IconId != null
				? String(row.icon_id ?? row.iconId ?? row.IconId)
				: null,
		is_abstract: Boolean(abstractRaw),
		graphObjectType: inferGraphObjectTypeFromMetamodelRow(row, code),
		editorFeature: binding?.editorFeature ?? canonicalFeatureType(code),
		schemaClass: binding?.schemaClass,
	};
}

function mapTypeParameterRow(row: unknown): MetamodelTypeParameter | null {
	if (!isObject(row)) return null;
	const id = String(row.id ?? row.Id ?? "").trim();
	const code = String(row.code ?? row.Code ?? "").trim();
	const name = String(row.name ?? row.Name ?? "").trim();
	const objectTypeId = String(
		row.object_type_id ?? row.objectTypeId ?? row.ObjectTypeId ?? "",
	).trim();
	if (!id || !code || !name || !objectTypeId) return null;

	const def = row.default_value ?? row.defaultValue ?? row.DefaultValue;
	const min = row.min_value ?? row.minValue ?? row.MinValue;
	const max = row.max_value ?? row.maxValue ?? row.MaxValue;
	const composite =
		row.composite_parameter_id ??
		row.compositeParameterId ??
		row.CompositeParameterId;
	const isCompositeRoot =
		row.is_composite_root ?? row.isCompositeRoot ?? row.IsCompositeRoot;

	return {
		id,
		object_type_id: objectTypeId,
		code,
		name,
		data_type: String(
			row.data_type ?? row.dataType ?? row.DataType ?? "string",
		),
		unit_id:
			row.unit_id != null || row.unitId != null || row.UnitId != null
				? String(row.unit_id ?? row.unitId ?? row.UnitId)
				: null,
		default_value: def != null ? String(def) : null,
		min_value: typeof min === "number" ? min : null,
		max_value: typeof max === "number" ? max : null,
		is_required: Boolean(
			row.is_required ?? row.isRequired ?? row.IsRequired,
		),
		display_order: Number(
			row.display_order ?? row.displayOrder ?? row.DisplayOrder ?? 0,
		),
		composite_parameter_id:
			composite != null ? String(composite) : null,
		is_composite_root: Boolean(isCompositeRoot),
	};
}

function mapUnitRow(row: unknown): MetamodelUnit | null {
	if (!isObject(row)) return null;
	const id = String(row.id ?? row.Id ?? "").trim();
	const code = String(row.code ?? row.Code ?? "").trim();
	const name = String(row.name ?? row.Name ?? "").trim();
	if (!id || !code || !name) return null;
	return {
		id,
		code,
		name,
		symbol: String(row.symbol ?? row.Symbol ?? code),
		dimension: String(row.dimension ?? row.Dimension ?? ""),
		si_unit_id:
			row.si_unit_id != null || row.siUnitId != null
				? String(row.si_unit_id ?? row.siUnitId)
				: null,
		conversion_factor: Number(
			row.conversion_factor ??
				row.conversionFactor ??
				row.ConversionFactor ??
				1,
		),
		is_base: Boolean(row.is_base ?? row.isBase ?? row.IsBase),
	};
}

/** Тип показывается в палитре редактора. */
export function isPaletteMetamodelType(type: MetamodelObjectType): boolean {
	const binding = getMetamodelEditorBinding(type.code);
	if (!binding) return false;
	if (type.is_abstract && !binding.paletteDespiteAbstract) return false;
	return true;
}

export function sortPaletteTypes(
	types: MetamodelObjectType[],
): MetamodelObjectType[] {
	return [...types].sort((a, b) => {
		const oa =
			getMetamodelEditorBinding(a.code)?.paletteOrder ?? 999;
		const ob =
			getMetamodelEditorBinding(b.code)?.paletteOrder ?? 999;
		if (oa !== ob) return oa - ob;
		return a.name.localeCompare(b.name, "ru");
	});
}

/** Разбор экспорта `metamodel_main.json` (objectTypes, typeParameters, units). */
export function parseMetamodelExport(body: unknown): MetamodelExportBundle | null {
	if (!isObject(body)) return null;

	const rawTypes = body.objectTypes ?? body.ObjectTypes;
	const objectTypes: MetamodelObjectType[] = [];
	if (Array.isArray(rawTypes)) {
		for (const row of rawTypes) {
			const t = mapMetamodelObjectTypeRow(row);
			if (t) objectTypes.push(t);
		}
	}
	if (!objectTypes.length) return null;

	const typeParameters: MetamodelTypeParameter[] = [];
	const rawParams = body.typeParameters ?? body.TypeParameters;
	if (Array.isArray(rawParams)) {
		for (const row of rawParams) {
			const p = mapTypeParameterRow(row);
			if (p) typeParameters.push(p);
		}
	}

	const units: MetamodelUnit[] = [];
	const rawUnits = body.units ?? body.Units;
	if (Array.isArray(rawUnits)) {
		for (const row of rawUnits) {
			const u = mapUnitRow(row);
			if (u) units.push(u);
		}
	}

	return {
		version: body.version != null ? String(body.version) : undefined,
		branchId:
			body.branchId != null ? String(body.branchId) : undefined,
		branchName:
			body.branchName != null ? String(body.branchName) : undefined,
		objectTypes,
		typeParameters,
		units,
	};
}
