import {
    LinearGraphicObject,
    PointerGraphicObject,
    useGraphicSchemeStore,
    type CopyObject,
    type DndState,
    type GraphicPoint,
} from "@/shared/graphical-editor";
import { type ObjectInfo } from "@/shared/graphical-editor";
import { useAppMode } from "@/features/app-mode";
import { useSelectedObjectStore, type FilterSelectedObjects } from "@/entities/select-object";
import { createLabelsByProject, type DataContentControlValve } from ".";

export function useDataScheme() {
    const graphicSchemeStore = useGraphicSchemeStore();
    const projectsStore = useProjectsStore();
    const appMode = useAppMode();

    const isLoading = ref(true);

    onMounted(async () => {
        await refreshScheme(projectsStore.projectId);
        await nextTick();
    });

    watch(appMode, mode => {
        graphicSchemeStore.setDraggable(mode === "Editor");
    });

    watch(
        () => projectsStore.projectId,
        async value => {
            await refreshScheme(value);
            await nextTick();
        },
    );

    async function refreshScheme(projectId?: number) {
        isLoading.value = true;
        graphicSchemeStore.clearStore();
        if (projectId !== null && projectId !== undefined) {
            const { result } = await getGraphicObjects(projectId);
            if (!result) {
                isLoading.value = false;
                return;
            }

            const graphicObjects = result;

            const techResult = await getTechObjects(projectId);
            if (!techResult.result) {
                isLoading.value = false;
                return;
            }
            const techObjects = techResult.result;

            const linearObjectsInfos: ObjectInfo[] = [];
            const pointerObjectsInfos: ObjectInfo[] = [];

            for (const graphicObj of graphicObjects) {
                const techObj = techObjects.find(o => o.id === graphicObj.techObjectId);

                if (techObj) {
                    if (graphicObj.points) {
                        const info: ObjectInfo = {
                            id: graphicObj.id,
                            graphType: graphicObj.type,
                            techObjectId: techObj.id,
                            points: graphicObj.points,
                            rotateAngle: graphicObj.rotationAngle,
                            techType: techObj.type,
                            objectType: "linear",
                            label: techObj.displayName,
                            fillColor: fillColors.default,
                            strokeColor: strokeColors.default,
                        };
                        linearObjectsInfos.push(info);
                    } else if (graphicObj.position) {
                        const info: ObjectInfo = {
                            id: graphicObj.id,
                            graphType: graphicObj.type,
                            techObjectId: techObj.id,
                            position: graphicObj.position,
                            rotateAngle: graphicObj.rotationAngle,
                            flipVertical: graphicObj.flipVertical,
                            flipHorizontal: graphicObj.flipHorizontal,
                            techType: techObj.type,
                            objectType: "pointer",
                            label: techObj.displayName,
                            fillColor: fillColors.default,
                            strokeColor: strokeColors.default,
                        };
                        pointerObjectsInfos.push(info);
                    }
                }
            }

            const pointerGraphicObjects = fuctoryPointerGraphicObjects(pointerObjectsInfos);
            const linearGraphicObjects = fuctoryLinearGraphicObjects(linearObjectsInfos);
            const textualGraphicObjects = await createLabelsByProject(projectId);

            const passports = await getPassport(projectId);
            if (passports.result && !passports.error) {
                await initThiсknessPipes(passports.result, linearGraphicObjects);
            }

            if (projectsStore.regimeId !== undefined) {
                const regimes = await getRegime(projectId, projectsStore.regimeId);
                if (regimes.result && !regimes.error) {
                    await refreshStateObjectsByRegime(regimes.result.data, pointerGraphicObjects);
                }
            }

            graphicSchemeStore.addPointerObjects(pointerGraphicObjects);
            graphicSchemeStore.addLinearObjects(linearGraphicObjects);
            graphicSchemeStore.addTextualObjects(textualGraphicObjects);

            isLoading.value = false;
        } else {
            isLoading.value = false;
        }
    }

    return {
        isLoading,
    };
}

export async function createGraphicObjectDnd(
    state: Omit<DndState, "createrCallback">,
): Promise<(PointerGraphicObject | LinearGraphicObject)[]> {
    const projectsStore = useProjectsStore();
    if (projectsStore.projectId === undefined || !state.info) {
        console.error(state.info);
        return [];
    }
    const isLinear = state.draggedType === "linear";
    const techObject: TechObjectDto = {
        id: -1,
        type: state.info.typeTech,
        displayName: "New object",
    };
    let fillColor = fillColors.default;
    let strokeColor = strokeColors.default;
    let controlMode: ControlMode | undefined;
    //создаём тех объект
    const techObjectIds = await createTechObjects(projectsStore.projectId, [techObject]);
    if (techObjectIds === undefined || techObjectIds!.length < 1) return [];
    techObject.id = techObjectIds![0] as number;
    //создаём пустой паспорт
    createEmptyTechObjectPassport(projectsStore.projectId, techObject.id, techObject.type);
    //создаём пустой режим при наличии
    if (projectsStore.regimeId !== undefined) {
        await createEmptyTechObjectRegime(
            projectsStore.projectId!,
            projectsStore.regimeId,
            techObject.id,
            techObject.type,
        );
        if (
            techObject.type === TechObjectTypeDto.BlowdownValve ||
            techObject.type === TechObjectTypeDto.Valve ||
            techObject.type === TechObjectTypeDto.PressureControlValve ||
            techObject.type === TechObjectTypeDto.TemperatureControlValve ||
            techObject.type === TechObjectTypeDto.FlowRateControlValve ||
            techObject.type === TechObjectTypeDto.WaterbathHeater
        ) {
            fillColor = fillColors.success;
            strokeColor = strokeColors.success;
        }

        if (
            techObject.type === TechObjectTypeDto.PressureControlValve ||
            techObject.type === TechObjectTypeDto.TemperatureControlValve ||
            techObject.type === TechObjectTypeDto.FlowRateControlValve
        ) {
            controlMode = ControlMode.Fixed;
        }
    }

    const graphicObject: GraphicObjectDto = {
        id: -1,
        type: state.info.typeGraph,
        techObjectId: techObject.id,
    };
    if (isLinear) {
        graphicObject.points = state.info!.points!.map(p => ({
            x: p.x + state.position.x,
            y: p.y + state.position.y,
        }));
    } else {
        graphicObject.position = {
            x: state.position.x,
            y: state.position.y,
        };
        graphicObject.rotationAngle = 0;
        graphicObject.flipHorizontal = false;
        graphicObject.flipVertical = false;
    }
    const graphicObjectIds = await createGraphicObjects(projectsStore.projectId, [graphicObject]);
    if (isLinear) {
        const info: ObjectInfo = {
            id: graphicObjectIds![0],
            graphType: graphicObject.type,
            techObjectId: techObject.id,
            points: graphicObject.points!.map(
                o =>
                    <GraphicPoint>{
                        x: o.x,
                        y: o.y,
                    },
            ),
            techType: techObject.type,
            objectType: "linear",
            fillColor: fillColors.default,
            strokeColor: strokeColors.default,
        };
        return fuctoryLinearGraphicObjects([info]);
    } else {
        const info: ObjectInfo = {
            id: graphicObjectIds![0],
            graphType: graphicObject.type,
            techObjectId: techObject.id,
            position: {
                x: graphicObject.position!.x,
                y: graphicObject.position!.y,
            },
            techType: techObject.type,
            objectType: "pointer",
            label: techObject.displayName,
            fillColor,
            strokeColor,
            controlMode,
        };
        return fuctoryPointerGraphicObjects([info]);
    }
}

export async function createGraphicObjectsEditor(
    bufferObjects: CopyObject[],
): Promise<{ pointers: PointerGraphicObject[]; linears: LinearGraphicObject[] } | undefined> {
    // инициализация
    const projectsStore = useProjectsStore();
    const idsLastNewObject = new Map<number, GraphicObjectDto>();
    const isPointer = (type: GraphicObjectTypeDto) =>
        type !== GraphicObjectTypeDto.PipelineSegment && type !== GraphicObjectTypeDto.Pipe;
    if (!projectsStore.projectId) return;

    //создание тех объектов
    const lastTechObjects = bufferObjects.map<TechObjectDto>(b => ({
        id: -1,
        type: b.techType,
        displayName: "New object",
    }));
    const techObjectIds = await createTechObjects(projectsStore.projectId, lastTechObjects);
    if (techObjectIds === undefined || techObjectIds.length == 0) return;

    //создаём Map для сохранения старых id и новых
    techObjectIds.forEach((v, i) => {
        idsLastNewObject.set(bufferObjects[i].techObjectId, {
            ...bufferObjects[i],
            techObjectId: v,
        });
    });
    //создание графических
    const objectRequests: GraphicObjectDto[] = idsLastNewObject.values().toArray();
    const graphicObjectIds = await createGraphicObjects(projectsStore.projectId, objectRequests);

    const filterCopyObjectsResult = filterCopyObjects(bufferObjects) as FilterSelectedObjects[];

    for (const typeCopyObjects of filterCopyObjectsResult) {
        //получаем паспорта и режимы по конкретному типу объектов
        const result = await filterTechObjectPassports(
            projectsStore.projectId,
            typeCopyObjects.ids,
            typeCopyObjects.type,
        );
        if (result === undefined) return;
        const objectsPassports = result;
        let objectsRegimes;
        if (projectsStore.regimeId) {
            const result = await filterTechObjectsRegime(
                projectsStore.projectId,
                projectsStore.regimeId,
                typeCopyObjects.ids,
                typeCopyObjects.type,
            );
            if (result) objectsRegimes = result;
        }
        if (!objectsPassports) return;

        const passportInfos = objectsPassports.map(p => ({
            ...p,
            ...{
                objectId: idsLastNewObject.get(p.objectId)!,
            },
        }));

        await createTechObjectsPassport(projectsStore.projectId, passportInfos, typeCopyObjects.type);

        if (objectsRegimes) {
            const regimeInfos = objectsRegimes.map(r => ({
                ...r,
                ...{
                    objectId: idsLastNewObject.get(r.objectId)!,
                },
            }));
            await createTechObjectRegimes(
                projectsStore.projectId,
                projectsStore.regimeId!,
                regimeInfos,
                typeCopyObjects.type,
            );
        }
    }

    const pointerObjectsInfo: ObjectInfo[] = [];
    const linearObjectsInfo: ObjectInfo[] = [];

    objectRequests.forEach((objectRequest, i) => {
        if (graphicObjectIds === undefined) return;
        if (isPointer(bufferObjects[i].type)) {
            const info: ObjectInfo = {
                id: graphicObjectIds[i],
                techType: bufferObjects[i].techType,
                position: objectRequest.position,
                techObjectId: objectRequest.techObjectId,
                graphType: objectRequest.type,
                rotateAngle: objectRequest.rotationAngle,
                flipHorizontal: objectRequest.flipHorizontal,
                flipVertical: objectRequest.flipVertical,
                objectType: "pointer",
                label: "New object",
                fillColor: bufferObjects[i].fillColor,
                strokeColor: bufferObjects[i].strokeColor,
            };
            pointerObjectsInfo.push(info);
        } else {
            const info: ObjectInfo = {
                id: graphicObjectIds[i],
                techType: bufferObjects[i].techType,
                points: objectRequest.points,
                techObjectId: objectRequest.techObjectId,
                graphType: objectRequest.type,
                objectType: "linear",
                label: "New object",
            };
            linearObjectsInfo.push(info);
        }
    });
    const pointerObjects: PointerGraphicObject[] = fuctoryPointerGraphicObjects(pointerObjectsInfo);
    const linearObjects: LinearGraphicObject[] = fuctoryLinearGraphicObjects(linearObjectsInfo);

    const selectedObjectStore = useSelectedObjectStore();
    if (pointerObjects.length > 0) {
        if (pointerObjects.length > 1) {
            selectedObjectStore.setSelectedObject(
                pointerObjects.map(p => ({
                    id: p.techObjectId!,
                    type: p.techType!,
                })),
                true,
            );
        } else {
            selectedObjectStore.setSelectedObject({
                id: pointerObjects[0].techObjectId!,
                type: pointerObjects[0].techType!,
            });
        }
        selectedObjectStore.selectedGraphicObjectId = pointerObjects[0].idObject;
    } else if (linearObjects.length > 0) {
        if (linearObjects.length > 1) {
            selectedObjectStore.setSelectedObject(
                linearObjects.map(l => ({
                    id: l.techObjectId!,
                    type: l.techType!,
                })),
                true,
            );
        } else {
            selectedObjectStore.setSelectedObject(
                {
                    id: linearObjects[0].techObjectId!,
                    type: linearObjects[0].techType!,
                },
                false,
            );
        }
        selectedObjectStore.selectedGraphicObjectId = linearObjects[0].idObject;
    }

    return {
        pointers: pointerObjects,
        linears: linearObjects,
    };
}

/**
 * Фильтрует объекты по типам
 * @param bufferObjects - массив объектов
 * @returns массив объектов где каждый объект это тип объекта и **технологичесиекие** id - ки объектов соответствующие этому типу
 */
function filterCopyObjects(bufferObjects: CopyObject[]):FilterSelectedObjects[] {
    if (bufferObjects.length < 1) return [];
    const types = new Set(bufferObjects.map(o => o.techType));
    const result: FilterSelectedObjects[] = [];
    types.forEach(type => {
        const ids = bufferObjects.filter(o => o.techType === type).map(o => o.techObjectId);
        result.push({
            type,
            ids,
        });
    });
    return result;
}

async function initThiсknessPipes(passportsResult: PassportDto, linearGraphicObjects: LinearGraphicObject[]) {
    if (!passportsResult || !passportsResult.pipePassports) return;
    const diametersPipePassports: { objectId: number; diameter: number; hr: number }[] =
        passportsResult.pipePassports.map(pl => ({
            objectId: pl.objectId,
            diameter: pl.diameter,
            hr: pl.hydraulicResistanceFactor,
        }));

    const diameterPipelineResult = passportsResult.pipelineSegmentPassports?.map(pl => pl.objectId) ?? [];

    diametersPipePassports.forEach(d => {
        const pipe = linearGraphicObjects.find(pl => pl.techObjectId === d.objectId);
        if (pipe) {
            if (d.hr === 0) {
                pipe.setThickness(1);
            } else {
                pipe.setThickness(convertTechToGraphicStepDiameter(d.diameter));
            }
        }
    });

    diameterPipelineResult.forEach(d => {
        const pipe = linearGraphicObjects.find(pl => pl.techObjectId === d);
        if (pipe) {
            pipe.setThickness(5);
        }
    });
}

async function refreshStateObjectsByRegime(regimeResult: RegimeDataDto, pointerGraphicObjects: PointerGraphicObject[]) {
    const dataRegimesControlValve: DataContentControlValve[] = [
        ...(regimeResult.pressureControlValveRegimes?.map<DataContentControlValve>(pcv => ({
            objectId: pcv.objectId,
            isInitialOpeningNotZero: pcv.opening > 0,
            controlMode: Number(pcv.controlMode),
        })) ?? []),
        ...(regimeResult.flowRateControlValveRegimes?.map<DataContentControlValve>(fcv => ({
            objectId: fcv.objectId,
            isInitialOpeningNotZero: fcv.opening > 0,
            controlMode: Number(fcv.controlMode),
        })) ?? []),
        ...(regimeResult.temperatureControlValveRegimes?.map<DataContentControlValve>(tcv => ({
            objectId: tcv.objectId,
            isInitialOpeningNotZero: tcv.opening > 0,
            controlMode: Number(tcv.controlMode),
        })) ?? []),
    ];
    const dataRegimesValve: { objectId: number; isOpened: boolean }[] = [
        ...(regimeResult.valveRegimes?.map<{ objectId: number; isOpened: boolean }>(v => ({
            objectId: v.objectId,
            isOpened: v.state === ValveStateDto.Opened,
        })) ?? []),
        ...(regimeResult.blowdownValveRegimes?.map<{ objectId: number; isOpened: boolean }>(bdv => ({
            objectId: bdv.objectId,
            isOpened: bdv.state === ValveBinaryStateDto.Opened,
        })) ?? []),
    ];

    //TODO: Изменить после появления режима WBH
    const dataRegimeWbh: { objectId: number }[] =
        regimeResult.waterbathHeaterRegimes?.map<{ objectId: number }>(wbh => ({ objectId: wbh.objectId })) ?? [];

    const dataRegimeTransfers: { objectId: number; isFlowRate: boolean }[] = [
        ...(regimeResult.producerRegimes?.map<{ objectId: number; isFlowRate: boolean }>(p => ({
            objectId: p.objectId,
            isFlowRate: (p.flow?.flowRate ?? 0) > 0,
        })) ?? []),
        ...(regimeResult.consumerRegimes?.map<{ objectId: number; isFlowRate: boolean }>(c => ({
            objectId: c.objectId,
            isFlowRate: (c.flow?.flowRate ?? 0) > 0,
        })) ?? []),
        ...(regimeResult.subsystemSeparatorRegimes?.map<{ objectId: number; isFlowRate: boolean }>(ss => ({
            objectId: ss.objectId,
            isFlowRate: (ss.InletFlow?.flowRate ?? 0) > 0 && (ss.OutletFlow?.flowRate ?? 0) > 0,
        })) ?? []),
    ];

    const dataRegimesControllers: { objectId: number; controlMode: ControlModeDto }[] = [
        ...(regimeResult.pcvControllerRegimes?.map<{ objectId: number; controlMode: ControlModeDto }>(p => ({
            objectId: p.objectId,
            controlMode: p.controlMode,
        })) ?? []),
        ...(regimeResult.wbhControllerRegimes?.map<{ objectId: number; controlMode: ControlModeDto }>(w => ({
            objectId: w.objectId,
            controlMode: w.controlMode,
        })) ?? []),
    ];

    dataRegimesControlValve.forEach(r => {
        const finderControlValve = pointerGraphicObjects.find(p => p.techObjectId == r.objectId) as
            | PointerGraphicObject
            | undefined;
        if (finderControlValve) {
            (finderControlValve as GraphicObjectControlValves).setControlMode(Number(r.controlMode));
            if (r.isInitialOpeningNotZero) {
                finderControlValve.setFillStrokeColor(fillColors.success, strokeColors.success);
            } else {
                finderControlValve.setFillStrokeColor(fillColors.danger, strokeColors.danger);
            }
        }
    });

    dataRegimesValve.forEach(r => {
        const finderValve = pointerGraphicObjects.find(p => p.techObjectId == r.objectId) as
            | PointerGraphicObject
            | undefined;
        if (finderValve) {
            if (r.isOpened) {
                finderValve.setFillStrokeColor(fillColors.success, strokeColors.success);
            } else {
                finderValve.setFillStrokeColor(fillColors.danger, strokeColors.danger);
            }
        }
    });

    dataRegimeWbh.forEach(r => {
        const finderWbh = pointerGraphicObjects.find(p => p.techObjectId == r.objectId) as
            | PointerGraphicObject
            | undefined;
        if (finderWbh) {
            finderWbh.setFillStrokeColor(fillColors.default, strokeColors.default);
        }
    });

    dataRegimeTransfers.forEach(r => {
        const finderTransfer = pointerGraphicObjects.find(p => p.techObjectId == r.objectId) as
            | PointerGraphicObject
            | undefined;
        if (finderTransfer) {
            if (r.isFlowRate) {
                finderTransfer.setFillStrokeColor(fillColors.success, strokeColors.success);
            } else {
                finderTransfer.setFillStrokeColor(fillColors.default, strokeColors.default);
            }
        }
    });

    dataRegimesControllers.forEach(r => {
        const finderController = pointerGraphicObjects.find(p => p.techObjectId == r.objectId);
        if (finderController) {
            (finderController as unknown as IObjectControlMode).setControlMode(Number(r.controlMode));
        }
    });
}
