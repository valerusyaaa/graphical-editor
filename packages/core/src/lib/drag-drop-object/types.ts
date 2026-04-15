import { LinearGraphicObject, type ObjectType, PointerGraphicObject, type XYPosition } from "../../model";

export type DropInfo = {
    typeGraph: GraphicObjectTypeDto;
    typeTech: TechObjectTypeDto;
    position?: GraphicPointDto;
    points?: GraphicPointDto[];
};

export type DndState = {
    dragNodeId: string;
    isDragging: boolean;
    isDragOver: boolean;
    position: XYPosition;
    draggedType: ObjectType;
    info: DropInfo | undefined;
    createrCallback:
        | ((state: Omit<DndState, "createrCallback">) => Promise<(PointerGraphicObject | LinearGraphicObject)[]>)
        | undefined;
};
