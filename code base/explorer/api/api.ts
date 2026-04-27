import { compareNumbers, compareStrings } from "@/shared/common";
import { getTechObjects, type TechObjectDto, type TechObjectTypeDto, useProjectsStore } from "@/entities/projects";
import { TechObjectNode, TechObjectTypeNode } from "../model";

export async function getNodes(): Promise<TechObjectTypeNode[] | undefined> {
    const techStore = useProjectsStore();
    if (techStore.projectId) {
        const { result } = await getTechObjects(techStore.projectId);
        if (!result) return undefined;
        const techObjectsResult = result;
        const techObjects = [...new Set(techObjectsResult.map(o => o.type))].sort((a, b) => compareNumbers(a, b));

        let techNodes: TechObjectTypeNode[] | undefined;
        if (techObjects.length > 0) {
            techNodes = [];
            for (const techObject of techObjects) {
                let typeTechNode = createTechObjectTypeNode(techObject, techObjectsResult);
                techNodes.push(typeTechNode);
            }
        }
        return techNodes;
    }
    return undefined;
}

// export async function getNodes(): Promise<LocationNode[] | undefined>
// {
//     const techStore = useProjectsStore();
//     if (techStore.projectId)
//     {
//         const techObjects = await getTechObjects(techStore.projectId);
//         const locations = [...new Set(techObjects.filter(o => o.location).map(o => o.location!))]
//             .sort((a, b) => compareNumbers(a.displayIndex, b.displayIndex));
//
//         let locationNodes: LocationNode[] | undefined;
//         if (locations.length > 0)
//         {
//             locationNodes = [];
//             for (const location of locations)
//             {
//                 let locationNode = createLocationNode(location, techObjects);
//                 locationNodes.push(locationNode);
//             }
//         }
//         return locationNodes;
//     }
//     return undefined;
// }
//
// function createLocationNode(
//     location: Location,
//     techObjects: TechObjectDto[]): LocationNode
// {
//     const locationNode = new LocationNode(location);
//     const locationTechObjects = techObjects.filter(o => o.location === location);
//     if (locationTechObjects.length > 0)
//     {
//         locationNode.children = [];
//         const types = [...new Set(locationTechObjects.map(o => o.type))]
//             .sort((a, b) => compareStrings(a.displayName, b.displayName));
//         for (const type of types)
//         {
//             const typeNode = createTechObjectTypeNode(type, locationTechObjects, locationNode);
//             locationNode.children.push(typeNode);
//         }
//     }
//     return locationNode;
// }
//
function createTechObjectTypeNode(
    type: TechObjectTypeDto,
    techObjects: TechObjectDto[]
): TechObjectTypeNode {
    const typeNode = new TechObjectTypeNode(type);
    typeNode.children = [];
    const typeTechObjects = techObjects
        .filter(o => o.type === type)
        .sort((a, b) => compareStrings(a.displayName, b.displayName));
    for (const techObject of typeTechObjects) {
        const techObjectNode = createTechObjectNode(techObject, typeNode);
        typeNode.children.push(techObjectNode);
    }
    return typeNode;
}

function createTechObjectNode(techObject: TechObjectDto, parent: TechObjectTypeNode): TechObjectNode {
    return new TechObjectNode(techObject, parent);
}

// function createPropertyNode(
//     property: Property,
//     parent: TechObjectNode | PropertyNode): PropertyNode
// {
//     const propertyNode = new PropertyNode(property, parent);
//     if (property.properties-panel && property.properties-panel.length > 0)
//     {
//         propertyNode.children = [];
//         const properties-panel = property.properties-panel
//             .sort((a, b) => compareNumbers(a.displayIndex, b.displayIndex));
//         for (const property of properties-panel)
//         {
//             const subPropertyNode = createPropertyNode(property, propertyNode);
//             propertyNode.children.push(subPropertyNode);
//         }
//     }
//     return propertyNode;
// }
