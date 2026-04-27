import type { TreeNode } from "primevue/treenode";
import {
    convertTechObjectTypeToDisplayName,
    convertTechObjectTypeNameToIcon,
    type TechObjectDto,
    TechObjectTypeDto,
} from "@/entities/projects";

export abstract class NodeBase implements TreeNode {
    key: string;
    parent?: NodeBase;

    protected constructor(key: string, parent?: NodeBase) {
        this.key = parent ? `${parent.key}:${key}` : key;
        this.parent = parent;
    }

    public getParents(): NodeBase[] {
        let parents: NodeBase[] = [];
        let temp = this.parent;
        while (temp) {
            parents.push(temp);
            temp = temp.parent;
        }
        return parents;
    }

    public update?() {}
}
export class TechObjectTypeNode extends NodeBase {
    label?: string;
    icon?: string;
    children?: TreeNode[];
    data: TechObjectTypeDto;
    selectable: boolean;

    constructor(type: TechObjectTypeDto) {
        const translationKey = convertTechObjectTypeToDisplayName(type);
        super(translationKey);
        this.data = type;
        this.label = translationKey;
        this.icon = convertTechObjectTypeNameToIcon(type);
        this.selectable = false;
    }
}

export class TechObjectNode extends NodeBase {
    label?: string;
    icon?: string;
    children?: TreeNode[];
    data: TechObjectDto;
    selectable: boolean;

    constructor(techObject: TechObjectDto, parent: TechObjectTypeNode) {
        super(techObject.id.toString(), parent);
        this.data = techObject;
        this.label = techObject.displayName;
        this.icon = parent.icon;
        this.selectable = true;
    }
}
