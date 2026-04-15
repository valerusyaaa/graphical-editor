export function convertToStyleName(graphicObjectType: GraphicObjectTypeDto, selected: boolean): string {
    let result = "";
    switch (graphicObjectType) {
        case GraphicObjectTypeDto.BlowdownValve:
            result = "blowdown-valve";
            break;
        case GraphicObjectTypeDto.CheckValve:
            result = "check-valve";
            break;
        case GraphicObjectTypeDto.Consumer:
            result = "consumer";
            break;
        case GraphicObjectTypeDto.ControlValve:
            result = "control-valve";
            break;
        case GraphicObjectTypeDto.ElectricalHeater:
            result = "electrical-heater";
            break;
        case GraphicObjectTypeDto.Producer:
            result = "producer";
            break;
        case GraphicObjectTypeDto.Pipe:
            result = "pipe";
            break;
        case GraphicObjectTypeDto.PipelineSegment:
            result = "pipeline-segment";
            break;
        case GraphicObjectTypeDto.Valve:
            result = "valve";
            break;
        case GraphicObjectTypeDto.SmallValve:
            result = "small-valve";
            break;
        case GraphicObjectTypeDto.SmallControlValve:
            result = "small-control-valve";
            break;
        case GraphicObjectTypeDto.WaterbathHeater:
            result = "waterbath-heater";
            break;
        case GraphicObjectTypeDto.FlowRateMeter:
            result = "flow-rate-meter";
            break;
        case GraphicObjectTypeDto.GasSeparationUnit:
            result = "gas-separation-unit";
            break;
        case GraphicObjectTypeDto.GasMeteringStation:
            result = "gas-metering-station";
            break;
        case GraphicObjectTypeDto.LauncherPigTrap:
            result = "launcher-pig-trap";
            break;
        case GraphicObjectTypeDto.ReceiverPigTrap:
            result = "receiver-pig-trap";
            break;
        case GraphicObjectTypeDto.Sensor:
            result = "sensor";
            break;
        case GraphicObjectTypeDto.Endpoint:
            result = "endpoint";
            break;
        case GraphicObjectTypeDto.SubsystemSeparator:
            result = "subsystem-separator";
            break;
    }
    if (selected) {
        result += "-select";
    }

    return result;
}

export function convertToStyle(graphicObjectType: GraphicObjectTypeDto): string {
    switch (graphicObjectType) {
        case GraphicObjectTypeDto.Pipe:
            return "scheme-edge-pipe";
        case GraphicObjectTypeDto.PipelineSegment:
            return "scheme-edge-pipeline";
        default:
            return String();
    }
}
