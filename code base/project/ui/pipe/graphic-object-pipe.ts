import type { ObjectInfo } from "@/shared/graphical-editor";
import { GraphicObjectBasePipe } from "../../model/base-pipe-graphic-object";
import { directionIconColors } from "../../lib";

export class GraphicObjectPipe extends GraphicObjectBasePipe {
    constructor(info: ObjectInfo) {
        super(info);
        this.thickness = info.thikness ?? 1;
        this.pipeColor = "#858585";
        this.arrowColor = directionIconColors.pipe.direction;
    }
}
