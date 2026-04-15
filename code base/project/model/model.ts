export function getOffsetsGraphicObject(type: GraphicObjectTypeDto): OffsetsDto {
    switch (type) {
        case GraphicObjectTypeDto.Valve:
            return {
                left: 20,
                top: 10,
            };
        case GraphicObjectTypeDto.SmallValve:
            return {
                left: 10,
                top: 10,
            };
        case GraphicObjectTypeDto.ControlValve:
            return {
                left: 20,
                top: 30,
            };
        case GraphicObjectTypeDto.SmallControlValve:
            return {
                left: 10,
                top: 30,
            };
        case GraphicObjectTypeDto.Consumer:
            return {
                left: 0,
                top: 20,
            };
        case GraphicObjectTypeDto.Producer:
            return {
                left: 40,
                top: 20,
            };
        case GraphicObjectTypeDto.BlowdownValve:
            return {
                left: 10,
                top: 40,
            };
        case GraphicObjectTypeDto.ElectricalHeater:
            return {
                left: 20,
                top: 10,
            };
        case GraphicObjectTypeDto.WaterbathHeater:
            return {
                left: 40,
                top: 20,
            };
        case GraphicObjectTypeDto.FlowRateMeter:
            return {
                left: 20,
                top: 50,
            };
        case GraphicObjectTypeDto.GasSeparationUnit:
            return {
                left: 40,
                top: 80,
            };
        case GraphicObjectTypeDto.LauncherPigTrap:
            return {
                left: 80,
                top: 20,
            };
        case GraphicObjectTypeDto.ReceiverPigTrap:
            return {
                left: 80,
                top: 20,
            };
        case GraphicObjectTypeDto.SubsystemSeparator:
            return {
                left: 20,
                top: 10,
            };
        case GraphicObjectTypeDto.Endpoint:
            return {
                left: 10,
                top: 10,
            };
        default:
            return {
                left: 0,
                top: 0,
            };
    }
}

export function getWidhtGraphicObject(type: GraphicObjectTypeDto): number {
    switch (type) {
        case GraphicObjectTypeDto.Valve:
            return 40;
        case GraphicObjectTypeDto.SmallValve:
            return 20;
        case GraphicObjectTypeDto.ControlValve:
            return 40;
        case GraphicObjectTypeDto.SmallControlValve:
            return 20;
        case GraphicObjectTypeDto.Consumer:
            return 40;
        case GraphicObjectTypeDto.Producer:
            return 40;
        case GraphicObjectTypeDto.BlowdownValve:
            return 20;
        case GraphicObjectTypeDto.ElectricalHeater:
            return 40;
        case GraphicObjectTypeDto.WaterbathHeater:
            return 80;
        case GraphicObjectTypeDto.FlowRateMeter:
            return 40;
        case GraphicObjectTypeDto.GasSeparationUnit:
            return 80;
        case GraphicObjectTypeDto.GasMeteringStation:
            return 40;
        case GraphicObjectTypeDto.LauncherPigTrap:
            return 160;
        case GraphicObjectTypeDto.ReceiverPigTrap:
            return 160;
        case GraphicObjectTypeDto.Endpoint:
            return 20;
        default:
            return 0;
    }
}

export function getSignSymbolControlValve(type: TechObjectTypeDto): string | undefined {
    switch (type) {
        case TechObjectTypeDto.PressureControlValve:
            return "P";
        case TechObjectTypeDto.TemperatureControlValve:
            return "T";
        case TechObjectTypeDto.FlowRateControlValve:
            return "F";
        default:
            return undefined;
    }
}
