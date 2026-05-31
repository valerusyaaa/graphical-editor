import { ObjectType, Offsets, XYPosition } from "../model";

export type ObjectDescription = {
    featureObjectType: string;
    graphObjectType: ObjectType;
    thikness?: number;
    strokeWidth?: number;
    offsets?: Offsets;
    polynom?: XYPosition[]
    fillColor?: string;
    strokeColor?: string;
    /** Цвет контура слоя selection (без заливки), если поддерживается типом объекта */
    selectionStrokeColor?: string;

}

export type GraphicObjectDto <Data extends ObjectBaseData> = {
    id: number;
    featureObjectType: string;
    graphObjectType: ObjectType;
    position?: XYPosition;
    points?: XYPosition[];
    rotateAngle?: number;
    flipHorizontal?: boolean;
    flipVertical?: boolean;
    data?: Data ;
}

/** Привязка конца трубы к узлу схемы (junction 0 — порт по умолчанию). */
export type PipePortLink = {
	objectId: number;
	junction: number;
};

export type ObjectBaseData = {
	techObjectId: number;
	/** Идентификатор типа из БД метамодели (`object_types.id`, UUID). */
	objectTypeId?: string;
	/** Для `pipe`: логические связи с поставщиком/потребителем для экспорта и пересчёта геометрии. */
	pipeTopology?: {
		start?: PipePortLink;
		end?: PipePortLink;
	};
	/** Дерево `properties` объекта в формате бэкенда (SimplePipe). */
	backendProperties?: Record<string, unknown>;
	/** Monitor: id объекта-источника (`sourceID` в EditedJSON). */
	monitorSourceId?: number;
	/** Monitor: значения `result.1` … `result.10`. */
	monitorResultSlots?: string[];
	/** Monitor: строки для отрисовки (заполняется `syncMonitorsInObjectList`). */
	monitorDisplayLines?: { text: string; color: string }[];
	/** id объекта в data-service для окна графиков (1…5 кран, 6 труба). */
	chartObjectId?: number;
};