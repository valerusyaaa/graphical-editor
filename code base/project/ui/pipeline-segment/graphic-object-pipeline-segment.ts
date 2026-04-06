import {  type ObjectInfo } from "@/shared/graphical-editor";
import { GraphicObjectBasePipe } from "../../model/base-pipe-graphic-object";
import { directionIconColors } from "../../lib";

export class GraphicObjectPipelineSegment extends GraphicObjectBasePipe {
    constructor(info: ObjectInfo) {
        super(info);
        this.thickness = info.thikness ?? 5;
        this.pipeColor = "#0c7a9e";
        this.arrowColor =directionIconColors.pipelineSegment.direction;
    }
}
