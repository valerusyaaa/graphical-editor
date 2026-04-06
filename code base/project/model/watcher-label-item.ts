import {
    GraphicLabelItemSourceTypeDto,
    type GraphicLabelDto,
    type GraphicLabelItemDto,
    type TechObjectTypeDto,
} from "../api";
import { useGraphicSchemeStore } from "@/shared/graphical-editor";
import type { GraphicObjectLabel } from "../ui";
import { useUnitsStore } from "@/shared/units";
import { getValueByPath } from "@/shared/lib";
import { useTechPropertiesStore } from "@/entities/metamodel";
import { toFormatNumber } from "@/shared/echarts";
import { toFormattedString } from "@/shared/common";

export class WatcherLabelItem {
    scope: GraphicLabelItemSourceTypeDto;
    targetTechObjectId: number;
    targetGraphicObjectId: number;
    techType: TechObjectTypeDto;
    path?: string;
    constructor(
        scope: GraphicLabelItemSourceTypeDto,
        graphObjectId: number,
        techObjectId: number,
        techType: TechObjectTypeDto,
        path?: string
    ) {
        this.scope = scope;
        this.targetTechObjectId = techObjectId;
        this.targetGraphicObjectId = graphObjectId;
        this.techType = techType;
        this.path = path;
    }
    refreshValue<T>(value: T) {}
    refreshValueByPath<T>(value: T, path: string) {
        const graphicSchemeStore = useGraphicSchemeStore();
        const techPropertiesStore = useTechPropertiesStore();
        const labels = graphicSchemeStore.textalObjs.filter(
            to => (to.data as GraphicLabelDto).linkedGraphicObjectId === this.targetGraphicObjectId
        ) as GraphicObjectLabel[];
        labels.forEach(m => {
            const data = m.data as GraphicLabelDto;
            if (data.items) {
                const changeItems = data.items.slice();
                changeItems.forEach(chi => {
                    if (
                        chi.sourceType &&
                        chi.sourcePropertyPath &&
                        chi.sourceType === this.scope &&
                        chi.sourcePropertyPath.propertyPath === path
                    ) {
                        const propertInfo = techPropertiesStore.getPropertyInfoByPath(Number(this.techType), path, [
                            "Passport",
                            "Regime",
                        ]);
                        if (propertInfo && propertInfo.numberOptions) {
                            chi.sourceText = toFormattedString(Number(value), propertInfo.numberOptions.digits);
                        } else {
                            chi.sourceText = String(value);
                        }
                    }
                });
                if (changeItems && changeItems.length > 0) {
                    const viewport = graphicSchemeStore.getViewport();
                    if (!viewport) {
                        return;
                    }
                    m.redrawText(changeItems, viewport);
                    viewport._onUpdate();
                }
            }
        });
    }
    refreshCalculationData(objResult: any) {
        const unitStore = useUnitsStore();
        const graphicSchemeStore = useGraphicSchemeStore();
        const techPropertiesStore = useTechPropertiesStore();
        const labels = graphicSchemeStore.textalObjs.filter(
            to => to.techObjectId === this.targetTechObjectId
        ) as GraphicObjectLabel[];
        labels.forEach(m => {
            const filteredItems = (m.data as GraphicLabelDto).items
                ?.filter(i => i.sourcePropertyPath !== undefined && i.sourceType === this.scope)
                .map<GraphicLabelItemDto>(i => {
                    const path = i.sourcePropertyPath!.propertyPath;
                    const value = getValueByPath(objResult, path);
                    let text = String();
                    if (i.sourceType === GraphicLabelItemSourceTypeDto.CalculatedValue && i.sourcePropertyPath) {
                        const propertyInfo = techPropertiesStore.getPropertyInfoByPath(Number(this.techType), path, [
                            "Passport",
                            "Regime",
                        ]);
                        if (propertyInfo && propertyInfo.numberOptions) {
                            text = toFormattedString(Number(value), propertyInfo.numberOptions.digits);
                        } else {
                            text = String(value);
                        }
                    }
                    return {
                        ...i,
                        sourceText: text,
                    };
                });
            if (filteredItems) {
                const viewport = graphicSchemeStore.getViewport();
                if (!viewport) {
                    return;
                }
                m.redrawText(filteredItems, viewport);
                viewport._onUpdate();
            }
        });
    }
}
