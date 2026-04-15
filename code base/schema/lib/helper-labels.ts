import { Viewport } from "pixi-viewport";
import {
    AlignmentDto,
    createGraphicLabelItems,
    createGraphicLabels,
    filterDataPointsByTechObjects,
    filterGraphicObjects,
    getDataPoints,
    getGraphicLabel,
    getGraphicLabels,
    getTechObject,
    getTechObjectPassport,
    GraphicLabelItemSourceTypeDto,
    GraphicObjectLabel,
    TechObjectTypeDto,
    useProjectsStore,
    type GraphicLabelDto,
    type GraphicLabelItemDto,
    type RegimeDataDto,
    type SpecialPassportPropertyPath,
} 
import { useGraphicSchemeStore, type ObjectInfo } from "@/shared/graphical-editor";
import type { MenuItem } from "primevue/menuitem";
import type { GraphicObjectScheme, ITool, SelectedGraphicObject, XYPosition } from "@/shared/graphical-editor";
import { Assets } from "pixi.js";
import { getResult } from "@/widgets/tech-regime-editor/lib/helpers";
import { getValueByPath } from "@/shared/lib";
import { toFormattedString } from "@/shared/common";
import { useTechPropertiesStore } from "@/entities/metamodel";
import type { WithRequired } from "@/shared/model";
import { filterProcessedTimePoints, filterRawTimePoints, type TimeSeriesFilterDto } from "@/entities/historical-data";
import moment from "moment";
import { useUnitsStore } from "@/shared/units";

type RawItemWithDataPoint = {
    item: WithRequired<GraphicLabelItemDto, "sourcePropertyPath">;
    dataPointId: number;
    unitId?: string;
    techType: TechObjectTypeDto;
};

export async function loadFonts() {
    Assets.addBundle("fonts", {
        base: "fonts/bitmap-arail-fonts/base.fnt",
        bold: "fonts/bitmap-arail-fonts/bold.fnt",
        italic: "fonts/bitmap-arail-fonts/italic.fnt",
        boldItalic: "fonts/bitmap-arail-fonts/bold-italic.fnt",
    });

    await Assets.loadBundle("fonts");
}

export async function createLabelsByProject(projectId: number): Promise<GraphicObjectLabel[]> {
    const labelsResult = await getGraphicLabels(projectId);
    const labelObjectsInfo = (labelsResult.result as GraphicLabelDto[]) ?? ([] as GraphicLabelDto[]);

    let textualObjectsInfos: ObjectInfo<GraphicLabelDto>[] = [];
    textualObjectsInfos = labelObjectsInfo.map<ObjectInfo<GraphicLabelDto>>(lInfo => {
        return {
            id: lInfo.id,
            objectType: "textual",
            data: lInfo,
        };
    });
    return textualObjectsInfos.map<GraphicObjectLabel>(info => new GraphicObjectLabel(info)) ?? [];
}

export async function createEmptyLabel(
    position: XYPosition,
    object?: GraphicObjectScheme | SelectedGraphicObject
): Promise<GraphicObjectLabel | undefined> {
    const projectsStore = useProjectsStore();
    if (projectsStore.projectId === undefined) return;

    const requestLabelDto: GraphicLabelDto = {
        id: -1,
        position,
        linkedGraphicObjectId: object?.idObject,
        anchorAlignment: AlignmentDto.CenterBottom,
        backgroundColor: "transparent",
        borderColor: "transparent",
        borderThickness: 0,
    };
    const labelId = await createGraphicLabels(projectsStore.projectId, [requestLabelDto]);
    if (labelId === undefined || labelId.length == 0) {
        return;
    }
    const requestLabelItemsDto: GraphicLabelItemDto[] = [
        {
            id: -1,
            alignment: AlignmentDto.Center,
            column: 0,
            row: 0,
            columnSpan: 1,
            rowSpan: 1,
            sourceText: "Empty text",
            sourceType: GraphicLabelItemSourceTypeDto.Text,
            marginLeft: 0,
            marginBottom: 0,
            marginRight: 0,
            marginTop: 0,
            fontSize: 12,
            isTextBold: false,
            isTextItalic: false,
            textColor: "#ffffff",
        },
    ];
    const graphicLabelItemsIdResult = await createGraphicLabelItems(
        projectsStore.projectId,
        labelId[0],
        requestLabelItemsDto
    );
    if (graphicLabelItemsIdResult && graphicLabelItemsIdResult.length > 0) {
        //TODO временные заглущки на BlowdownValve и techObjectId
        const createdLabelItems = graphicLabelItemsIdResult.map<GraphicLabelItemDto>((id, index) => ({
            ...requestLabelItemsDto[index],
            id,
        }));
        const label = new GraphicObjectLabel({
            id: labelId[0],
            objectType: "textual",
            data: { ...requestLabelDto, id: labelId[0], items: createdLabelItems },
        });
        return label;
    }
    return;
}

export const getAllTechTypes = (): { label: string; techTypes: TechObjectTypeDto }[] => {
    return [
        {
            label: "Valve",
            techTypes: TechObjectTypeDto.Valve,
        },
        {
            label: "Check Valve",
            techTypes: TechObjectTypeDto.CheckValve,
        },
        {
            label: "Consumer",
            techTypes: TechObjectTypeDto.Consumer,
        },
        {
            label: "Electrical Heater",
            techTypes: TechObjectTypeDto.ElectricalHeater,
        },
        {
            label: "Endpoint",
            techTypes: TechObjectTypeDto.Endpoint,
        },
        {
            label: "Flow Rate Control Valve",
            techTypes: TechObjectTypeDto.FlowRateControlValve,
        },
        {
            label: "Pressure Control Valve",
            techTypes: TechObjectTypeDto.PressureControlValve,
        },
        {
            label: "Temperature Control Valve",
            techTypes: TechObjectTypeDto.TemperatureControlValve,
        },
        {
            label: "Flow Rate Meter",
            techTypes: TechObjectTypeDto.FlowRateMeter,
        },
        {
            label: "Gas Metering Station",
            techTypes: TechObjectTypeDto.GasMeteringStation,
        },
        {
            label: "Gas Separation Unit",
            techTypes: TechObjectTypeDto.GasSeparationUnit,
        },
        {
            label: "Pig Trap",
            techTypes: TechObjectTypeDto.PigTrap,
        },
        {
            label: "Pipe",
            techTypes: TechObjectTypeDto.Pipe,
        },
        {
            label: "Pipeline",
            techTypes: TechObjectTypeDto.Pipeline,
        },
        {
            label: "Pipeline Segment",
            techTypes: TechObjectTypeDto.PipelineSegment,
        },
        {
            label: "Producer",
            techTypes: TechObjectTypeDto.Producer,
        },
        {
            label: "Sensor",

            techTypes: TechObjectTypeDto.Sensor,
        },
        {
            label: "Subsystem Separator",
            techTypes: TechObjectTypeDto.SubsystemSeparator,
        },
        {
            label: "Waterbath Heater",
            techTypes: TechObjectTypeDto.WaterbathHeater,
        },
    ];
};

export const getMenuItemTechTypes = (
    name: string,
    labelId: number,
    techType: TechObjectTypeDto,
    viewport: Viewport,
    tool: ITool,
    delta?: XYPosition
): MenuItem => {
    return {
        label: name,
        icon: convertTechObjectTypeToDisplayName(techType),
        command: async () => {
            const graphicSchemeStore = useGraphicSchemeStore();
            const labels = await createLabelsByObjects(labelId, [techType], delta);
            if (labels) {
                labels.forEach(label => {
                    label.draw(viewport, tool);
                });
                graphicSchemeStore.addTextualObjects(labels);
                viewport._onUpdate();
            }
        },
    };
};

export async function createLabelsByObjects(labelId: number, objectIds: number[], delta?: XYPosition) {
    const projectsStore = useProjectsStore();
    if (projectsStore.projectId === undefined) return;
    const projectId = projectsStore.projectId;
    const graphicObjects = await filterGraphicObjects(projectId, objectIds);
    const graphicLabel = await getGraphicLabel(projectId, labelId);
    if (!graphicObjects || !graphicLabel.result) return;
    const lableDto = graphicLabel.result;
    const requestLabelsDto: GraphicLabelDto[] = graphicObjects.map<GraphicLabelDto>(go => {
        let position = { x: 0, y: 0 };
        if (go.position) {
            if (delta) {
                position = {
                    x: go.position.x - delta.x,
                    y: go.position.y - delta.y,
                };
            } else {
                position = go.position;
            }
        } else if (go.points) {
            const poinstMedianPos: XYPosition = {
                x: (go.points[0].x + go.points.at(-1)!.x) / 2,
                y: (go.points[0].y + go.points.at(-1)!.y) / 2,
            };
            if (delta) {
                position = {
                    x: poinstMedianPos.x - delta.x,
                    y: poinstMedianPos.y - delta.y,
                };
            } else {
                position = poinstMedianPos;
            }
        }
        return {
            ...lableDto,
            id: -1,
            linkedGraphicObjectId: go.id,
            position: position,
            items: [],
        };
    });
    const labelIds = await createGraphicLabels(projectId, requestLabelsDto);
    if (labelIds === undefined || labelIds.length == 0) {
        return;
    }

    const requestLabelItemsDtoByLabels: { labelId: number; items: GraphicLabelItemDto[] }[] = [];
    for (let index = 0; index < requestLabelsDto.length; index++) {
        requestLabelItemsDtoByLabels.push({
            labelId: labelIds[index],
            items: await overrideItems(objectIds[index], lableDto.items ?? [], projectId),
        });
    }

    const labelItemsIds = [];
    for (const item of requestLabelItemsDtoByLabels) {
        labelItemsIds.push(await createGraphicLabelItems(projectId, item.labelId, item.items));
    }
    const newLabels = labelItemsIds.map((items, index) => {
        return {
            ...requestLabelsDto[index],
            id: labelIds[index],
            items: items?.map((id, _index) => ({ ...requestLabelItemsDtoByLabels[index].items?.[_index], ...{ id } })),
        };
    });

    const labels = labelIds.map(
        (lId, index) =>
            new GraphicObjectLabel({
                id: lId,
                objectType: "textual",
                data: newLabels[index],
            })
    );
    return labels;
}

export async function overrideItems(
    techObjectId: number,
    items: GraphicLabelItemDto[],
    projectId: number
): Promise<GraphicLabelItemDto[]> {
    const overriddenItems: GraphicLabelItemDto[] = [];
    for (const item of items) {
        if (item.sourcePropertyPath) {
            overriddenItems.push({
                ...item,
                sourceText: await overrideSourceText(item, techObjectId, projectId),
                sourcePropertyPath: {
                    techObjectId: techObjectId,
                    propertyPath: item.sourcePropertyPath.propertyPath,
                },
            });
        } else {
            overriddenItems.push(item);
        }
    }
    return overriddenItems;
}

export async function overrideSourceText(
    item: GraphicLabelItemDto,
    techObjectId: number,
    projectId: number
): Promise<string> {
    const path = item.sourcePropertyPath!.propertyPath;
    if (item.sourceType === GraphicLabelItemSourceTypeDto.PassportValue) {
        const specialPassportPropertyPath: (SpecialPassportPropertyPath | (string & {}))[] = [
            "id",
            "name",
            "description",
        ];
        const techObject = await getTechObject(projectId, techObjectId);
        if (!techObject.result) return "";
        if (specialPassportPropertyPath.includes(path)) {
            switch (path) {
                case "id":
                    return String(techObject.result.id);
                case "name":
                    return techObject.result.displayName ?? "";
                case "description":
                    return techObject.result.description ?? "";
            }
        } else {
            const passport = await getTechObjectPassport(projectId, techObjectId, techObject.result.type);
            if (passport.result) {
                return String(getValueByPath(passport.result, path));
            }
        }
        return "";
    }
    //TODO: add other source types
    return item.sourceText ?? "";
}

export async function createLabelsBySelectedObjects(
    labelId: number,
    delta?: XYPosition
): Promise<GraphicObjectLabel[] | undefined> {
    const graphicsSchemeStore = useGraphicSchemeStore();
    const ids = Array.from(
        new Set(
            [...graphicsSchemeStore.selectedPointerObjs, ...graphicsSchemeStore.selectedLinearObjs].map(o => o.idObject)
        )
    );
    return await createLabelsByObjects(labelId, ids, delta);
}

export async function createLabelsByAllObjects(
    labelId: number,
    delta?: XYPosition
): Promise<GraphicObjectLabel[] | undefined> {
    const graphicsSchemeStore = useGraphicSchemeStore();
    const ids = Array.from(
        new Set([...graphicsSchemeStore.pointerObjs, ...graphicsSchemeStore.linearObjs].map(o => o.idObject))
    );
    return await createLabelsByObjects(labelId, ids, delta);
}

export async function createLabelsByTechObjects(
    labelId: number,
    techTypes: TechObjectTypeDto[],
    delta?: XYPosition
): Promise<GraphicObjectLabel[] | undefined> {
    const graphicsSchemeStore = useGraphicSchemeStore();
    const ids = Array.from(
        new Set(
            [...graphicsSchemeStore.pointerObjs, ...graphicsSchemeStore.linearObjs]
                .filter(obj => obj.techType !== undefined && techTypes.includes(obj.techType))
                .map(o => o.idObject)
        )
    );
    return await createLabelsByObjects(labelId, ids, delta);
}

export async function refreshLabelsBySimulation(result: RegimeDataDto): Promise<void> {
    const graphicSchemeStore = useGraphicSchemeStore();
    const techPropertiesStore = useTechPropertiesStore();
    const projectsStore = useProjectsStore();
    const viewport = graphicSchemeStore.getViewport();

    if (!viewport || projectsStore.projectId === undefined) return;

    const labels = graphicSchemeStore.textalObjs as GraphicObjectLabel[];
    const graphicObjects = [...graphicSchemeStore.pointerObjs, ...graphicSchemeStore.linearObjs];

    labels.forEach(label => {
        const labelData = label.data as GraphicLabelDto;
        if (!labelData.items) return;
        const calculatedItems = labelData.items.filter(
            item => item.sourceType === GraphicLabelItemSourceTypeDto.CalculatedValue && item.sourcePropertyPath
        ) as Array<WithRequired<GraphicLabelItemDto, "sourcePropertyPath">>;
        if (calculatedItems.length === 0) return;

        const techObjectIds = new Set<number>(calculatedItems.map(item => item.sourcePropertyPath.techObjectId));
        const techObjects = new Map<number, TechObjectTypeDto>(
            graphicObjects
                .filter(obj => obj.techObjectId !== undefined && techObjectIds.has(obj.techObjectId))
                .map(obj => [obj.idObject, obj.techType as TechObjectTypeDto])
        );
        const updatedItems = calculatedItems.map<GraphicLabelItemDto>(item => {
            const techType = techObjects.get(item.sourcePropertyPath.techObjectId);
            if (techType !== undefined) {
                const path = item.sourcePropertyPath.propertyPath;
                const objResult = getResult(result, item.sourcePropertyPath.techObjectId, Number(techType));
                const value = getValueByPath(objResult, path);

                let formattedText: string;
                const propertyInfo = techPropertiesStore.getPropertyInfoByPath(Number(techType), path, ["Regime"]);

                if (propertyInfo?.numberOptions?.digits !== undefined) {
                    const unitValue = propertyInfo.numberOptions.unit.fromBase(value);
                    formattedText = toFormattedString(unitValue, propertyInfo.numberOptions.digits);
                } else {
                    formattedText = String(value);
                }

                return {
                    ...item,
                    sourceText: formattedText,
                };
            }

            return item;
        });

        const hasChanges = updatedItems.some(
            (item, index) =>
                item.sourceType === GraphicLabelItemSourceTypeDto.CalculatedValue &&
                item.sourceText !== labelData.items?.[index]?.sourceText
        );

        if (hasChanges) {
            const overrideItems = labelData.items.map<GraphicLabelItemDto>(item => {
                const updatedItem = updatedItems.find(i => i.id === item.id);
                return updatedItem ? updatedItem : item;
            });
            label.redrawText(overrideItems, viewport);
        }
    });

    viewport._onUpdate();
}

export async function refreshLabelsByHistoricalData(
    sourceType: GraphicLabelItemSourceTypeDto.RawValue | GraphicLabelItemSourceTypeDto.ProcessedValue
) {
    const graphicSchemeStore = useGraphicSchemeStore();
    const techPropertiesStore = useTechPropertiesStore();
    const projectsStore = useProjectsStore();
    const unitsStore = useUnitsStore();
    const projectId = projectsStore.projectId;
    const viewport = graphicSchemeStore.getViewport();

    if (!viewport || projectId === undefined) return;

    const labels = graphicSchemeStore.textalObjs as GraphicObjectLabel[];
    const graphicObjects = [...graphicSchemeStore.pointerObjs, ...graphicSchemeStore.linearObjs];

    const historicalItemsWithDataPoints: RawItemWithDataPoint[] = [];
    const techObjectsMap = new Map<number, TechObjectTypeDto>(
        graphicObjects
            .filter(obj => obj.techObjectId !== undefined && obj.techType !== undefined)
            .map(obj => [obj.techObjectId!, obj.techType as TechObjectTypeDto])
    );

    const AllHistoricalItems: Array<WithRequired<GraphicLabelItemDto, "sourcePropertyPath">> = []
    labels.forEach(label => {
        const labelData = label.data as GraphicLabelDto;
        if (!labelData.items) return;

        AllHistoricalItems.push(...labelData.items.filter(
            item => item.sourceType === sourceType && item.sourcePropertyPath
        ) as Array<WithRequired<GraphicLabelItemDto, "sourcePropertyPath">>);
    });

    const AllPropertyPath = AllHistoricalItems.map(hi => hi.sourcePropertyPath)

    const dataPoints = await filterDataPointsByTechObjects(projectId, AllPropertyPath)

    AllHistoricalItems.forEach(item => {
        const techObjectId = item.sourcePropertyPath.techObjectId;
        const techType = techObjectsMap.get(techObjectId);
        if (!techType) return;

        const dataPoint = dataPoints.find(
            dp =>
                dp.linkedPropertyPath.techObjectId === techObjectId &&
                dp.linkedPropertyPath.propertyPath === item.sourcePropertyPath.propertyPath
        );

        if (dataPoint) {
            historicalItemsWithDataPoints.push({
                item,
                dataPointId: dataPoint.id,
                unitId: dataPoint.unitId ?? "Dimensionless.ratio",
                techType,
            });
        }
    });

    if (historicalItemsWithDataPoints.length === 0) return;

    const uniqueDataPointIdsByUnitId = new Map(historicalItemsWithDataPoints.map(r => [r.dataPointId, r.unitId]));

    const requyeTimeSeriesFilter: TimeSeriesFilterDto = {
        dataPointIds: Array.from(uniqueDataPointIdsByUnitId.keys()),
        interval: {
            start: moment().subtract(1, "minute"),
            end: moment(),
        },
        limit: null,
    };
    const timeSeries =
        sourceType === GraphicLabelItemSourceTypeDto.RawValue
            ? await filterRawTimePoints(requyeTimeSeriesFilter)
            : await filterProcessedTimePoints(requyeTimeSeriesFilter);

    const valuesByDataPointId = new Map<number, number>();
    timeSeries.forEach(series => {
        if (series.points && series.points.length > 0) {
            let lastPoint = series.points[series.points.length - 1].value;
            const unitId = uniqueDataPointIdsByUnitId.get(series.dataPointId);
            if (unitId) {
                const unit = unitsStore.getUnitByPath(unitId);
                if (unit) {
                    lastPoint = unit.toBase(lastPoint);
                }
            }
            valuesByDataPointId.set(series.dataPointId, lastPoint);
        }
    });

    labels.forEach(label => {
        const labelData = label.data as GraphicLabelDto;
        if (!labelData.items) return;

        const historicalItems = labelData.items.filter(
            item => item.sourceType === sourceType && item.sourcePropertyPath
        ) as Array<WithRequired<GraphicLabelItemDto, "sourcePropertyPath">>;

        if (historicalItems.length === 0) return;

        const updatedItems = historicalItems.map<GraphicLabelItemDto>(item => {
            const itemWithDataPoint = historicalItemsWithDataPoints.find(r => r.item.id === item.id);
            if (!itemWithDataPoint) return item;

            const value = valuesByDataPointId.get(itemWithDataPoint.dataPointId);
            if (value === undefined) return item;

            const path = item.sourcePropertyPath.propertyPath;
            const propertyInfo = techPropertiesStore.getPropertyInfoByPath(Number(itemWithDataPoint.techType), path, [
                "Regime",
            ]);

            let formattedText: string;
            if (propertyInfo?.numberOptions?.digits !== undefined) {
                const unitValue = propertyInfo.numberOptions.unit.fromBase(value);
                formattedText = toFormattedString(unitValue, propertyInfo.numberOptions.digits);
            } else {
                formattedText = String(value);
            }

            return {
                ...item,
                sourceText: formattedText,
            };
        });

        const hasChanges = updatedItems.some(updatedItem => {
            const originalItem = labelData.items?.find(i => i.id === updatedItem.id);
            return (
                updatedItem.sourceType === sourceType &&
                originalItem &&
                updatedItem.sourceText !== originalItem.sourceText
            );
        });

        if (hasChanges) {
            const overrideItems = labelData.items.map<GraphicLabelItemDto>(item => {
                const updatedItem = updatedItems.find(i => i.id === item.id);
                return updatedItem ? updatedItem : item;
            });
            label.redrawText(overrideItems, viewport);
        }
    });

    viewport._onUpdate();
}
