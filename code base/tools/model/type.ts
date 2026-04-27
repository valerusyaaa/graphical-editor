import type { DefineComponent, Raw } from "vue";
import type { ObjectType, DropInfo } from "@/shared/graphical-editor";

export type ItemsScheme = {
    headerPanel: string;
    items: ItemsView[];
};

export type ItemsView = {
    component: Raw<Component | DefineComponent> | Component | DefineComponent;
    title: string;
    typeObj: ObjectType;
    info?: DropInfo;
    symbol?: string;
};
