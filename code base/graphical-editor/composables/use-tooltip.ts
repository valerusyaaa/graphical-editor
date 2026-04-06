import type {
    LinearGraphicObject,
    PointerGraphicObject,
    SelectedLinearGraphicObject,
    SelectedPointerGraphicObject,
    XYPosition,
} from "../model";

export interface IGraphicalEditorTooltip {
    showTooltip: (x: number, y: number, object: TooltipObject) => void;
    hideTooltip: () => void;
    updateTooltipPosition: (x: number, y: number) => void;
}

export interface ManagerTooltip extends IGraphicalEditorTooltip {
    tooltip: TooltipData;
}

type TooltipObject =
    | PointerGraphicObject
    | LinearGraphicObject
    | SelectedPointerGraphicObject
    | SelectedLinearGraphicObject;

export type TooltipData = {
    isVisible: boolean;
    position: XYPosition;
    object?: TooltipObject;
};

export function useTooltip(): ManagerTooltip {
    const tooltip = reactive<TooltipData>({
        isVisible: false,
        position: { x: 0, y: 0 },
    });

    function showTooltip(x: number, y: number, object: TooltipObject) {
        tooltip.isVisible = true;
        tooltip.position = { x, y };
        tooltip.object = object as unknown as TooltipObject;
    }

    function hideTooltip() {
        tooltip.isVisible = false;
        tooltip.object = undefined;
    }

    function updateTooltipPosition(x: number, y: number) {
        tooltip.position = { x, y };
    }

    return {
        tooltip: tooltip as TooltipData,
        showTooltip,
        hideTooltip,
        updateTooltipPosition,
    };
}
