import { useSimulationStore } from "@/entities/calculation-results";
import { useAppMode } from "@/features/app-mode";
import { LinearGraphicObject, PointerGraphicObject, useGraphicSchemeStore } from "@/shared/graphical-editor";
import { refreshLabelsByHistoricalData, refreshLabelsBySimulation } from "./helper-labels";
import { useHistoricalStore } from "@/entities/historical-data";

export type DataContentControlValve = {
    objectId: number;
    isInitialOpeningNotZero: boolean;
    controlMode: ControlModeDto;
};
type DataDirectionFlow = { objectId: number; directionFlow: DirectionFlow };

export function useRefreshContentSchema() {
    const graphicSchemeStore = useGraphicSchemeStore();
    const projectsStore = useProjectsStore();
    const simulationStore = useSimulationStore();
    const appMode = useAppMode();
    const historicalDataStore = useHistoricalStore();
    const classValveByState = <Map<ValveStateDto, (object: AnimationGraphicObject) => any>>new Map([
        [
            ValveStateDto.Opened,
            async object => {
                await object.stopPulsingColor();
                const viewport = graphicSchemeStore.getViewport();
                if (viewport) {
                    object.setFillStrokeAndDraw(fillColors.success, strokeColors.success, viewport);
                }
            },
        ],
        [
            ValveStateDto.Closed,
            async object => {
                await object.stopPulsingColor();
                const viewport = graphicSchemeStore.getViewport();
                if (viewport) {
                    object.setFillStrokeAndDraw(fillColors.danger, strokeColors.danger, viewport);
                }
            },
        ],
        [
            ValveStateDto.Opening,
            object => {
                if (object.stopPulseColorFn === undefined) {
                    object.startPulsingColor(
                        fillColors.warning,
                        fillColors.success,
                        strokeColors.warning,
                        strokeColors.success,
                    );
                }
            },
        ],
        [
            ValveStateDto.Closing,
            object => {
                if (object.stopPulseColorFn === undefined) {
                    object.startPulsingColor(
                        fillColors.warning,
                        fillColors.danger,
                        strokeColors.warning,
                        strokeColors.danger,
                    );
                }
            },
        ],
        [
            ValveStateDto.Intermediate,
            async object => {
                await object.stopPulsingColor();
                const viewport = graphicSchemeStore.getViewport();
                if (viewport) {
                    object.setFillStrokeAndDraw(fillColors.warning, strokeColors.warning, viewport);
                }
            },
        ],
    ]);

    async function refreshStatesByRegime() {
        if (!projectsStore.isProjectLoaded || projectsStore.regimeId === undefined) return;
        const { result: regimeResult, error } = await getRegime(projectsStore.projectId!, projectsStore.regimeId);
        if (!regimeResult || error) return;
        const regimeResultData = regimeResult.data;
        const dataRegimesControlValve: DataContentControlValve[] = [
            ...(regimeResultData.pressureControlValveRegimes?.map<DataContentControlValve>(pcv => ({
                objectId: pcv.objectId,
                isInitialOpeningNotZero: pcv.opening > 0,
                controlMode: Number(pcv.controlMode),
            })) ?? []),
            ...(regimeResultData.flowRateControlValveRegimes?.map<DataContentControlValve>(fcv => ({
                objectId: fcv.objectId,
                isInitialOpeningNotZero: fcv.opening > 0,
                controlMode: Number(fcv.controlMode),
            })) ?? []),
            ...(regimeResultData.temperatureControlValveRegimes?.map<DataContentControlValve>(tcv => ({
                objectId: tcv.objectId,
                isInitialOpeningNotZero: tcv.opening > 0,
                controlMode: Number(tcv.controlMode),
            })) ?? []),
        ];
        const dataRegimesValve: { objectId: number; isOpened: boolean }[] = [
            ...(regimeResultData.valveRegimes?.map<{ objectId: number; isOpened: boolean }>(v => ({
                objectId: v.objectId,
                isOpened: v.state === ValveStateDto.Opened,
            })) ?? []),
            ...(regimeResultData.blowdownValveRegimes?.map<{ objectId: number; isOpened: boolean }>(bdv => ({
                objectId: bdv.objectId,
                isOpened: bdv.state === ValveBinaryStateDto.Opened,
            })) ?? []),
        ];

        const dataRegimeWbh: { objectId: number; state: TechObjectStateDto }[] =
            regimeResultData.waterbathHeaterRegimes?.map<{
                objectId: number;
                state: TechObjectStateDto;
            }>(wbh => ({
                objectId: wbh.objectId,
                state: Number(wbh.state),
            })) ?? [];

        const dataRegimeTransfers: { objectId: number; isFlowRate: boolean }[] = [
            ...(regimeResult.data.producerRegimes?.map<{ objectId: number; isFlowRate: boolean }>(p => ({
                objectId: p.objectId,
                isFlowRate: (p.flow?.flowRate ?? 0) > 0,
            })) ?? []),
            ...(regimeResult.data.consumerRegimes?.map<{ objectId: number; isFlowRate: boolean }>(c => ({
                objectId: c.objectId,
                isFlowRate: (c.flow?.flowRate ?? 0) > 0,
            })) ?? []),
            ...(regimeResult.data.subsystemSeparatorRegimes?.map<{ objectId: number; isFlowRate: boolean }>(ss => ({
                objectId: ss.objectId,
                isFlowRate: (ss.InletFlow?.flowRate ?? 0) > 0 && (ss.OutletFlow?.flowRate ?? 0) > 0,
            })) ?? []),
        ];

        const dataRegimesControllers: { objectId: number; controlMode: ControlModeDto }[] = [
            ...(regimeResult.data.pcvControllerRegimes?.map<{ objectId: number; controlMode: ControlModeDto }>(p => ({
                objectId: p.objectId,
                controlMode: p.controlMode,
            })) ?? []),
            ...(regimeResult.data.wbhControllerRegimes?.map<{ objectId: number; controlMode: ControlModeDto }>(w => ({
                objectId: w.objectId,
                controlMode: w.controlMode,
            })) ?? []),
        ];

        dataRegimesControlValve.forEach(r => {
            const finderControlValve = graphicSchemeStore.scheme.layerGraphicObject.pointer.find(
                p => p.techObjectId == r.objectId,
            ) as PointerGraphicObject | undefined;
            if (finderControlValve) {
                (finderControlValve as unknown as GraphicObjectControlValves).setControlMode(Number(r.controlMode));
                if (r.isInitialOpeningNotZero) {
                    finderControlValve.setFillStrokeColor(fillColors.success, strokeColors.success);
                } else {
                    finderControlValve.setFillStrokeColor(fillColors.danger, strokeColors.danger);
                }
            }
        });

        dataRegimesValve.forEach(r => {
            const finderValve = graphicSchemeStore.scheme.layerGraphicObject.pointer.find(
                p => p.techObjectId == r.objectId,
            ) as PointerGraphicObject | undefined;
            if (finderValve) {
                if (r.isOpened) {
                    finderValve.setFillStrokeColor(fillColors.success, strokeColors.success);
                } else {
                    finderValve.setFillStrokeColor(fillColors.danger, strokeColors.danger);
                }
            }
        });

        dataRegimeWbh.forEach(wbh => {
            const finderWbh = graphicSchemeStore.scheme.layerGraphicObject.pointer.find(
                p => p.techObjectId == wbh.objectId,
            ) as PointerGraphicObject | undefined;
            if (finderWbh) {
                if (wbh.state === Number(TechObjectStateDto.On)) {
                    finderWbh.setFillStrokeColor(fillColors.success, strokeColors.success);
                } else {
                    finderWbh.setFillStrokeColor(fillColors.default, strokeColors.default);
                }
            }
        });

        dataRegimeTransfers.forEach(r => {
            const finderTransfer = graphicSchemeStore.scheme.layerGraphicObject.pointer.find(
                p => p.techObjectId == r.objectId,
            ) as PointerGraphicObject | undefined;
            if (finderTransfer) {
                if (r.isFlowRate) {
                    finderTransfer.setFillStrokeColor(fillColors.success, strokeColors.success);
                } else {
                    finderTransfer.setFillStrokeColor(fillColors.default, strokeColors.default);
                }
            }
        });

        dataRegimesControllers.forEach(r => {
            const finderController = graphicSchemeStore.scheme.layerGraphicObject.pointer.find(
                p => p.techObjectId == r.objectId,
            );
            if (finderController) {
                (finderController as unknown as IObjectControlMode).setControlMode(Number(r.controlMode));
            }
        });

        const viewport = graphicSchemeStore.getViewport();
        if (viewport) {
            viewport.removeChildren();
            graphicSchemeStore.linearObjs.forEach(po => {
                po.draw(viewport, graphicSchemeStore.tool, graphicSchemeStore.tooltipManager);
            });
            graphicSchemeStore.pointerObjs.forEach(po => {
                po.draw(viewport, graphicSchemeStore.tool, graphicSchemeStore.tooltipManager);
            });
            graphicSchemeStore.textalObjs.forEach(to => {
                to.draw(viewport, graphicSchemeStore.tool);
            });
            viewport._onUpdate();
            viewport.update(2);
        }
    }

    function refreshStatesBySimulation(result: RegimeDataDto) {
        const viewport = graphicSchemeStore.getViewport();
        if (!projectsStore.isProjectLoaded || projectsStore.regimeId === undefined || !viewport) return;
        const dataCalculationValve: { objectId: number; state?: ValveStateDto }[] = [
            ...(result.valveRegimes?.map(vr => ({ objectId: vr.objectId, state: vr.state })) ?? []),
            ...(result.flowRateControlValveRegimes?.map(fcv => ({ objectId: fcv.objectId, state: fcv.state })) ?? []),
            ...(result.pressureControlValveRegimes?.map(pcv => ({ objectId: pcv.objectId, state: pcv.state })) ?? []),
            ...(result.temperatureControlValveRegimes?.map(tcv => ({ objectId: tcv.objectId, state: tcv.state })) ??
                []),
        ];

        const dataBdvCalculationValve: { objectId: number; state: ValveBinaryStateDto }[] =
            result.blowdownValveRegimes?.map<{ objectId: number; state: ValveBinaryStateDto }>(bdv => ({
                objectId: bdv.objectId,
                state: Number(bdv.state),
            })) ?? [];

        const dataCalculationWbh: { objectId: number; state: TechObjectStateDto }[] =
            result.waterbathHeaterRegimes?.map<{
                objectId: number;
                state: TechObjectStateDto;
            }>(wbh => ({
                objectId: wbh.objectId,
                state: Number(wbh.state),
            })) ?? [];

        const dataCalculationTransfers: { objectId: number; isFlowRate: boolean }[] = [
            ...(result.producerRegimes?.map<{ objectId: number; isFlowRate: boolean }>(p => ({
                objectId: p.objectId,
                isFlowRate: (p.flow?.flowRate ?? 0) > 0,
            })) ?? []),
            ...(result.consumerRegimes?.map<{ objectId: number; isFlowRate: boolean }>(c => ({
                objectId: c.objectId,
                isFlowRate: (c.flow?.flowRate ?? 0) > 0,
            })) ?? []),
            ...(result.subsystemSeparatorRegimes?.map<{ objectId: number; isFlowRate: boolean }>(ss => ({
                objectId: ss.objectId,
                isFlowRate: (ss.InletFlow?.flowRate ?? 0) > 0 && (ss.OutletFlow?.flowRate ?? 0) > 0,
            })) ?? []),
        ];

        const dataRegimesControllers: { objectId: number; controlMode: ControlModeDto }[] = [
            ...(result.pcvControllerRegimes?.map<{ objectId: number; controlMode: ControlModeDto }>(p => ({
                objectId: p.objectId,
                controlMode: p.controlMode,
            })) ?? []),
            ...(result.wbhControllerRegimes?.map<{ objectId: number; controlMode: ControlModeDto }>(w => ({
                objectId: w.objectId,
                controlMode: w.controlMode,
            })) ?? []),
        ];

        dataCalculationValve.forEach(value => {
            const finderValve = graphicSchemeStore.scheme.layerGraphicObject.pointer.find(
                p => p.techObjectId == value.objectId,
            ) as AnimationGraphicObject | undefined;
            if (finderValve) {
                const classValve = classValveByState.get(Number(value.state));
                if (classValve) {
                    classValve(finderValve);
                }
            }
        });

        dataBdvCalculationValve.forEach(bdv => {
            const finderBdv = graphicSchemeStore.scheme.layerGraphicObject.pointer.find(
                p => p.techObjectId == bdv.objectId,
            ) as PointerGraphicObject | undefined;
            if (finderBdv) {
                if (bdv.state === ValveBinaryStateDto.Opened) {
                    finderBdv.setFillStrokeAndDraw(fillColors.success, strokeColors.success, viewport);
                } else {
                    finderBdv.setFillStrokeAndDraw(fillColors.danger, strokeColors.danger, viewport);
                }
            }
        });

        dataCalculationWbh.forEach(wbh => {
            const finderWbh = graphicSchemeStore.scheme.layerGraphicObject.pointer.find(
                p => p.techObjectId == wbh.objectId,
            ) as PointerGraphicObject | undefined;
            if (finderWbh) {
                if (wbh.state === Number(TechObjectStateDto.On)) {
                    finderWbh.setFillStrokeAndDraw(fillColors.success, strokeColors.success, viewport);
                } else {
                    finderWbh.setFillStrokeAndDraw(fillColors.danger, strokeColors.danger, viewport);
                }
            }
        });

        dataCalculationTransfers.forEach(r => {
            const finderTransfer = graphicSchemeStore.scheme.layerGraphicObject.pointer.find(
                p => p.techObjectId == r.objectId,
            ) as PointerGraphicObject | undefined;
            if (finderTransfer) {
                if (r.isFlowRate) {
                    finderTransfer.setFillStrokeAndDraw(fillColors.success, strokeColors.success, viewport);
                } else {
                    finderTransfer.setFillStrokeAndDraw(fillColors.default, strokeColors.default, viewport);
                }
            }
        });

        dataRegimesControllers.forEach(r => {
            const finderController = graphicSchemeStore.scheme.layerGraphicObject.pointer.find(
                p => p.techObjectId == r.objectId,
            );
            if (finderController) {
                (finderController as unknown as IObjectControlMode).setControlModeAndDraw(
                    Number(r.controlMode),
                    viewport,
                );
            }
        });
    }

    function getDirectionFlow(inletFlowRate: number, outletFlowRate: number, eps: number = 0.0004): DirectionFlow {
        if (Math.abs(inletFlowRate) > eps) {
            if (inletFlowRate > 0) {
                return "positive";
            } else {
                return "negative";
            }
        } else {
            return "none";
        }
    }
    function refreshDirectionFlowBySimulation(
        result: RegimeDataDto,
        pointerObjs: PointerGraphicObject[],
        linearObjs: LinearGraphicObject[],
        isRedraw: boolean = false,
    ) {
        const graphicSchemeStore = useGraphicSchemeStore();
        const viewport = graphicSchemeStore.getViewport();
        if (!viewport) return;
        const dataDirectionLinearObjects = getDirectionLinearObjects(result);
        dataDirectionLinearObjects.forEach(dataDirection => {
            const finderPipe = linearObjs.find(pl => pl.techObjectId === dataDirection.objectId) as GraphicObjectPipe;
            if (finderPipe) {
                const { colorArrow, colorReverseArrow } = getColorArrows(dataDirection);
                if (hasChangesColorArrows(colorArrow, colorReverseArrow, finderPipe)) {
                    finderPipe.setColorDuplexArrow(colorArrow, colorReverseArrow);
                    if (isRedraw) {
                        finderPipe.redraw(viewport);
                    }
                }
            }
        });

        const dataDirectionPointerObjects = getDirtectionPointerObjects(result);
        dataDirectionPointerObjects.forEach(dataDirection => {
            const finderObject = pointerObjs.find(
                obj => obj.techObjectId === dataDirection.objectId,
            ) as BaseGraphicObject;
            if (finderObject) {
                const { colorArrow, colorReverseArrow } = getColorArrows(dataDirection);
                if (hasChangesColorArrows(colorArrow, colorReverseArrow, finderObject)) {
                    finderObject.setColorDuplexArrow(colorArrow, colorReverseArrow);
                    if (isRedraw) {
                        finderObject.redraw(viewport);
                    }
                }
            }
        });
    }

    function getDirectionLinearObjects(result: RegimeDataDto): DataDirectionFlow[] {
        return [
            ...(result.pipeRegimes?.map<DataDirectionFlow>(p => ({
                objectId: p.objectId,
                directionFlow: getDirectionFlow(p.inletFlow?.flowRate ?? 0, p.outletFlow?.flowRate ?? 0),
            })) ?? []),
            ...(result.pipelineSegmentRegimes?.map<DataDirectionFlow>(p => ({
                objectId: p.objectId,
                directionFlow: getDirectionFlow(p.inletFlow?.flowRate ?? 0, p.outletFlow?.flowRate ?? 0),
            })) ?? []),
        ];
    }

    function getDirtectionPointerObjects(result: RegimeDataDto): DataDirectionFlow[] {
        return [
            ...(result.electricalHeaterRegimes?.map<DataDirectionFlow>(eh => ({
                objectId: eh.objectId,
                directionFlow: getDirectionFlow(eh.inletFlow?.flowRate ?? 0, eh.outletFlow?.flowRate ?? 0),
            })) ?? []),
            ...(result.pressureControlValveRegimes?.map<DataDirectionFlow>(pcv => ({
                objectId: pcv.objectId,
                directionFlow: getDirectionFlow(pcv.inletFlow?.flowRate ?? 0, pcv.outletFlow?.flowRate ?? 0),
            })) ?? []),
            ...(result.flowRateControlValveRegimes?.map<DataDirectionFlow>(fcv => ({
                objectId: fcv.objectId,
                directionFlow: getDirectionFlow(fcv.inletFlow?.flowRate ?? 0, fcv.outletFlow?.flowRate ?? 0),
            })) ?? []),
            ...(result.temperatureControlValveRegimes?.map<DataDirectionFlow>(tcv => ({
                objectId: tcv.objectId,
                directionFlow: getDirectionFlow(tcv.inletFlow?.flowRate ?? 0, tcv.outletFlow?.flowRate ?? 0),
            })) ?? []),
            ...(result.flowRateMeterRegimes?.map<DataDirectionFlow>(frm => ({
                objectId: frm.objectId,
                directionFlow: getDirectionFlow(frm.inletFlow?.flowRate ?? 0, frm.outletFlow?.flowRate ?? 0),
            })) ?? []),
            ...(result.gasSeparationUnitRegimes?.map<DataDirectionFlow>(gsu => ({
                objectId: gsu.objectId,
                directionFlow: getDirectionFlow(gsu.inletFlow?.flowRate ?? 0, gsu.outletFlow?.flowRate ?? 0),
            })) ?? []),
            ...(result.valveRegimes?.map<DataDirectionFlow>(v => ({
                objectId: v.objectId,
                directionFlow: getDirectionFlow(v.inletFlow?.flowRate ?? 0, v.outletFlow?.flowRate ?? 0),
            })) ?? []),
            ...(result.waterbathHeaterRegimes?.map<DataDirectionFlow>(wbh => ({
                objectId: wbh.objectId,
                directionFlow: getDirectionFlow(wbh.inletFlow?.flowRate ?? 0, wbh.outletFlow?.flowRate ?? 0),
            })) ?? []),
        ];
    }

    function getColorArrows(dataDirection: DataDirectionFlow): {
        colorArrow: string;
        colorReverseArrow: string | undefined;
    } {
        let colorArrow = directionIconColors.pipe.direction;
        let colorReverseArrow;
        if (dataDirection.directionFlow === "positive") {
            colorArrow = directionIconColors.pipe.directionFlow;
            colorReverseArrow = undefined;
        } else if (dataDirection.directionFlow === "negative") {
            colorArrow = directionIconColors.pipe.direction;
            colorReverseArrow = directionIconColors.pipe.directionFlow;
        } else {
            colorArrow = directionIconColors.pipe.direction;
            colorReverseArrow = undefined;
        }
        return {
            colorArrow,
            colorReverseArrow,
        };
    }

    function hasChangesColor(fillColor: string, strokeColor: string, object: PointerGraphicObject) {
        return object.fillColor !== fillColor || object.strokeColor !== strokeColor;
    }

    function hasChangesColorArrows(
        colorArrow: string,
        colorReverseArrow: string | undefined,
        object: BaseGraphicObject | GraphicObjectPipe,
    ) {
        return object.arrowColor !== colorArrow || object.reversArrowColor !== colorReverseArrow;
    }

    onBeforeMount(async () => {
        await nextTick();
        await refreshStatesByRegime();
    });

    watch(
        () => projectsStore.regimeId,
        async () => {
            await nextTick();
            await refreshStatesByRegime();
        },
    );

    watch(
        () => projectsStore.projectId,
        async () => {
            await nextTick();
            await refreshStatesByRegime();
        },
    );

    watch(
        () => simulationStore.lastResult,
        async result => {
            if (!result) return;
            refreshStatesBySimulation(result.data);
            refreshDirectionFlowBySimulation(
                result.data,
                graphicSchemeStore.pointerObjs,
                graphicSchemeStore.linearObjs,
                true,
            );
            refreshLabelsBySimulation(result.data);
        },
    );
    watch(
        () => historicalDataStore.historicalRawDataCount,
        async _ => {
            refreshLabelsByHistoricalData(GraphicLabelItemSourceTypeDto.RawValue);
        },
    );
    watch(
        () => historicalDataStore.historicalDataProcessingCount,
        async _ => {
            refreshLabelsByHistoricalData(GraphicLabelItemSourceTypeDto.ProcessedValue);
        },
    );

    watch(appMode, async (mode, lastMode) => {
        if (mode === "Editor") {
            await refreshStatesByRegime();
        }
    });
}
