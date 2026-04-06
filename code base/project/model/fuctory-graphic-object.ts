import { LinearGraphicObject, PointerGraphicObject, type ObjectInfo } from "@/shared/graphical-editor";
import { GraphicObjectTypeDto } from "../api";
import {
    GraphicObjectProducer,
    GraphicObjectConsumer,
    GraphicObjectPipe,
    GraphicObjectPipelineSegment,
    GraphicObjectValve,
    GraphicObjectSmallValve,
    GraphicObjectControlValve,
    GraphicObjectSmallControlValve,
    GraphicObjectBlowdownValve,
    GraphicObjectElectricalHeater,
    GraphicObjectWaterbathHeater,
    GraphicObjectFlowRateMeter,
    GraphicObjectGasSeparationUnit,
    GraphicObjectLauncherPigTrap,
    GraphicObjectReceiverPigTrap,
    GraphicObjectGasMeteringStation,
    GraphicObjectEndPoint,
    GraphicObjectSubsystemSeparator,
    GraphicObjectWbhController,
    GraphicObjectPcvController,
} from "../ui";

export function fuctoryPointerGraphicObjects(infos: ObjectInfo[]): PointerGraphicObject[] {
    const pointerObjects: PointerGraphicObject[] = [];
    infos.forEach(info => {
        switch (info.graphType) {
            case GraphicObjectTypeDto.Producer:
                pointerObjects.push(new GraphicObjectProducer(info));
                break;
            case GraphicObjectTypeDto.Consumer:
                pointerObjects.push(new GraphicObjectConsumer(info));
                break;
            case GraphicObjectTypeDto.Valve:
                pointerObjects.push(new GraphicObjectValve(info));
                break;
            case GraphicObjectTypeDto.SmallValve:
                pointerObjects.push(new GraphicObjectSmallValve(info));
                break;
            case GraphicObjectTypeDto.ControlValve:
                pointerObjects.push(new GraphicObjectControlValve(info));
                break;
            case GraphicObjectTypeDto.SmallControlValve:
                pointerObjects.push(new GraphicObjectSmallControlValve(info));
                break;
            case GraphicObjectTypeDto.BlowdownValve:
                pointerObjects.push(new GraphicObjectBlowdownValve(info));
                break;
            case GraphicObjectTypeDto.CheckValve:
                // Класс для CheckValve не импортирован, добавьте при необходимости
                break;
            case GraphicObjectTypeDto.ElectricalHeater:
                pointerObjects.push(new GraphicObjectElectricalHeater(info));
                break;
            case GraphicObjectTypeDto.WaterbathHeater:
                pointerObjects.push(new GraphicObjectWaterbathHeater(info));
                break;
            case GraphicObjectTypeDto.FlowRateMeter:
                pointerObjects.push(new GraphicObjectFlowRateMeter(info));
                break;
            case GraphicObjectTypeDto.GasSeparationUnit:
                pointerObjects.push(new GraphicObjectGasSeparationUnit(info));
                break;
            case GraphicObjectTypeDto.LauncherPigTrap:
                pointerObjects.push(new GraphicObjectLauncherPigTrap(info));
                break;
            case GraphicObjectTypeDto.ReceiverPigTrap:
                pointerObjects.push(new GraphicObjectReceiverPigTrap(info));
                break;
            case GraphicObjectTypeDto.GasMeteringStation:
                pointerObjects.push(new GraphicObjectGasMeteringStation(info));
                break;
            case GraphicObjectTypeDto.Sensor:
                // Класс для Sensor не импортирован, добавьте при необходимости
                break;
            case GraphicObjectTypeDto.Endpoint:
                pointerObjects.push(new GraphicObjectEndPoint(info));
                break;
            case GraphicObjectTypeDto.SubsystemSeparator:
                pointerObjects.push(new GraphicObjectSubsystemSeparator(info));
                break;
            case GraphicObjectTypeDto.WbhController:
                pointerObjects.push(new GraphicObjectWbhController(info));
                break;
            case GraphicObjectTypeDto.PcvController:
                pointerObjects.push(new GraphicObjectPcvController(info));
                break;
            case GraphicObjectTypeDto.Pipe:
                break;
            case GraphicObjectTypeDto.PipelineSegment:
                break;
            case undefined:
                break;
            default:
                const exhaustiveCheck: never = info.graphType;
                return exhaustiveCheck;
        }
    });
    return pointerObjects;
}

export function fuctoryLinearGraphicObjects(infos: ObjectInfo[]) {
    const linearObjects: LinearGraphicObject[] = [];
    infos.forEach(info => {
        switch (info.graphType) {
            case GraphicObjectTypeDto.Pipe:
                linearObjects.push(new GraphicObjectPipe(info));
                break;
            case GraphicObjectTypeDto.PipelineSegment:
                linearObjects.push(new GraphicObjectPipelineSegment(info));
                break;
        }
    });
    return linearObjects;
}
