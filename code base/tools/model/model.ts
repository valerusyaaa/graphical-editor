import type { ItemsScheme } from ".";
import {
    GraphicObjectTypeDto,
    TechObjectTypeDto,
    WrapperConsumer,
    WrapperPipe,
    WrapperPipelineSegment,
    WrapperProducer,
    WrapperValve,
    WrapperControlValve,
    WrapperSmallControlValve,
    WrapperSmallValve,
    WrapperEndpoint,
    WrapperFlowRateMeter,
    WrapperWaterbathHeater,
    WrapperElectricalHeater,
    WrapperBlowdownValve,
    WrapperGasSeparationUnit,
    WrapperLauncherPigTrap,
    WrapperReceiverPigTrap,
    WrapperGasMeteringStation,
    WrapperSubsystemSeparator,
    WrapperPcvController,
    WrapperWbhController,
} from "@/entities/projects";

export const getGraphicObjectItems = (): ItemsScheme[] => {
    return [
        {
            headerPanel: "Pipes",
            items: [
                {
                    title: "Pipe",
                    component: markRaw(WrapperPipe),
                    typeObj: "linear",
                    info: {
                        typeGraph: GraphicObjectTypeDto.Pipe,
                        typeTech: TechObjectTypeDto.Pipe,
                        points: [
                            {
                                x: 0,
                                y: 0,
                            },
                            {
                                x: 50,
                                y: 0,
                            },
                        ],
                    },
                },
                {
                    title: "Pipeline-segment",
                    component: markRaw(WrapperPipelineSegment),
                    typeObj: "linear",
                    info: {
                        typeGraph: GraphicObjectTypeDto.PipelineSegment,
                        typeTech: TechObjectTypeDto.PipelineSegment,
                        points: [
                            {
                                x: 0,
                                y: 0,
                            },
                            {
                                x: 50,
                                y: 0,
                            },
                        ],
                    },
                },
            ],
        },
        {
            headerPanel: "Valves",
            items: [
                {
                    title: "Valve",
                    component: markRaw(WrapperValve),
                    typeObj: "pointer",
                    info: {
                        typeGraph: GraphicObjectTypeDto.Valve,
                        typeTech: TechObjectTypeDto.Valve,
                    },
                },
                {
                    title: "Pressure Control Valve",
                    component: markRaw(WrapperControlValve),
                    typeObj: "pointer",
                    info: {
                        typeGraph: GraphicObjectTypeDto.ControlValve,
                        typeTech: TechObjectTypeDto.PressureControlValve,
                    },
                    symbol: "P",
                },
                {
                    title: "Flow Rate Control Valve",
                    component: markRaw(WrapperControlValve),
                    typeObj: "pointer",
                    info: {
                        typeGraph: GraphicObjectTypeDto.ControlValve,
                        typeTech: TechObjectTypeDto.FlowRateControlValve,
                    },
                    symbol: "F",
                },
                {
                    title: "Temperature Control Valve",
                    component: markRaw(WrapperControlValve),
                    typeObj: "pointer",
                    info: {
                        typeGraph: GraphicObjectTypeDto.ControlValve,
                        typeTech: TechObjectTypeDto.TemperatureControlValve,
                    },
                    symbol: "T",
                },
                {
                    title: "Small Valve",
                    component: markRaw(WrapperSmallValve),
                    typeObj: "pointer",
                    info: {
                        typeGraph: GraphicObjectTypeDto.SmallValve,
                        typeTech: TechObjectTypeDto.Valve,
                    },
                },
                {
                    title: "Small Pressure Control Valve",
                    component: markRaw(WrapperSmallControlValve),
                    typeObj: "pointer",
                    info: {
                        typeGraph: GraphicObjectTypeDto.SmallControlValve,
                        typeTech: TechObjectTypeDto.PressureControlValve,
                    },
                    symbol: "P",
                },
                {
                    title: "Small Flow Rate  Control Valve",
                    component: markRaw(WrapperSmallControlValve),
                    typeObj: "pointer",
                    info: {
                        typeGraph: GraphicObjectTypeDto.SmallControlValve,
                        typeTech: TechObjectTypeDto.FlowRateControlValve,
                    },
                    symbol: "F",
                },
                {
                    title: "Small Temperature Control Valve",
                    component: markRaw(WrapperSmallControlValve),
                    typeObj: "pointer",
                    info: {
                        typeGraph: GraphicObjectTypeDto.SmallControlValve,
                        typeTech: TechObjectTypeDto.TemperatureControlValve,
                    },
                    symbol: "T",
                },
            ],
        },
        {
            headerPanel: "Transfer Points",
            items: [
                {
                    title: "Producer",
                    component: markRaw(WrapperProducer),
                    typeObj: "pointer",
                    info: {
                        typeGraph: GraphicObjectTypeDto.Producer,
                        typeTech: TechObjectTypeDto.Producer,
                    },
                },
                {
                    title: "Consumer",
                    component: markRaw(WrapperConsumer),
                    typeObj: "pointer",
                    info: {
                        typeGraph: GraphicObjectTypeDto.Consumer,
                        typeTech: TechObjectTypeDto.Consumer,
                    },
                },
                {
                    title: "Endpoint",
                    component: markRaw(WrapperEndpoint),
                    typeObj: "pointer",
                    info: {
                        typeGraph: GraphicObjectTypeDto.Endpoint,
                        typeTech: TechObjectTypeDto.Endpoint,
                    },
                },
                {
                    title: "Blowdown Valve",
                    component: markRaw(WrapperBlowdownValve),
                    typeObj: "pointer",
                    info: {
                        typeGraph: GraphicObjectTypeDto.BlowdownValve,
                        typeTech: TechObjectTypeDto.BlowdownValve,
                    },
                },
                {
                    title: "Subsystem Separator",
                    component: markRaw(WrapperSubsystemSeparator),
                    typeObj: "pointer",
                    info: {
                        typeGraph: GraphicObjectTypeDto.SubsystemSeparator,
                        typeTech: TechObjectTypeDto.SubsystemSeparator,
                    },
                },
            ],
        },
        {
            headerPanel: "Measuring",
            items: [
                {
                    title: "Flow Rate Meter",
                    component: markRaw(WrapperFlowRateMeter),
                    typeObj: "pointer",
                    info: {
                        typeGraph: GraphicObjectTypeDto.FlowRateMeter,
                        typeTech: TechObjectTypeDto.FlowRateMeter,
                    },
                },
                {
                    title: "Gas Metering Station",
                    component: markRaw(WrapperGasMeteringStation),
                    typeObj: "pointer",
                    info: {
                        typeGraph: GraphicObjectTypeDto.GasMeteringStation,
                        typeTech: TechObjectTypeDto.GasMeteringStation,
                    },
                },
            ],
        },
        {
            headerPanel: "Heaters",
            items: [
                {
                    title: "Electrical Heater",
                    component: markRaw(WrapperElectricalHeater),
                    typeObj: "pointer",
                    info: {
                        typeGraph: GraphicObjectTypeDto.ElectricalHeater,
                        typeTech: TechObjectTypeDto.ElectricalHeater,
                    },
                },
                {
                    title: "Waterbath Heater",
                    component: markRaw(WrapperWaterbathHeater),
                    typeObj: "pointer",
                    info: {
                        typeGraph: GraphicObjectTypeDto.WaterbathHeater,
                        typeTech: TechObjectTypeDto.WaterbathHeater,
                    },
                },

            ],
        },
        {
            headerPanel: "Other",
            items: [
                {
                    title: "Gas Separation Unit",
                    component: markRaw(WrapperGasSeparationUnit),
                    typeObj: "pointer",
                    info: {
                        typeGraph: GraphicObjectTypeDto.GasSeparationUnit,
                        typeTech: TechObjectTypeDto.GasSeparationUnit,
                    },
                },
                {
                    title: "Launcher Pig Trap",
                    component: markRaw(WrapperLauncherPigTrap),
                    typeObj: "pointer",
                    info: {
                        typeGraph: GraphicObjectTypeDto.LauncherPigTrap,
                        typeTech: TechObjectTypeDto.PigTrap,
                    },
                },
                {
                    title: "Receiver Pig Trap",
                    component: markRaw(WrapperReceiverPigTrap),
                    typeObj: "pointer",
                    info: {
                        typeGraph: GraphicObjectTypeDto.ReceiverPigTrap,
                        typeTech: TechObjectTypeDto.PigTrap,
                    },
                },
                {
                    title: "WBH Controller",
                    component: markRaw(WrapperWbhController),
                    typeObj: "pointer",
                    info: {
                        typeGraph: GraphicObjectTypeDto.WbhController,
                        typeTech: TechObjectTypeDto.WbhController,
                    },
                },
                {
                    title: "PCV Controller",
                    component: markRaw(WrapperPcvController),
                    typeObj: "pointer",
                    info: {
                        typeGraph: GraphicObjectTypeDto.PcvController,
                        typeTech: TechObjectTypeDto.PcvController,
                    },
                },
            ],
        },
    ];
};
