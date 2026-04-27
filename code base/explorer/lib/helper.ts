import type { TreeNode } from "primevue/treenode";
import { useToast, type TreeExpandedKeys, type TreeSelectionKeys } from "primevue";

export function findSelectedNode(
    tree: TreeNode[],
    targetObject: number
): { expandKey: TreeExpandedKeys; selectedKey: TreeSelectionKeys } {
    const node = findChildrenRecursively(tree, targetObject);
    const selectedKey: TreeSelectionKeys = {};
    const expandKey: TreeExpandedKeys = {};
    if (node != null) {
        const keysArr = node.key.split(":");
        const location = keysArr[0];
        const locationAndType = keysArr.slice(0, 2).join(":");
        expandKey[location] = true;
        expandKey[locationAndType] = true;
        selectedKey[node.key] = true;
    }
    return { expandKey, selectedKey };
}

export function findChildrenRecursively(tree: TreeNode[], targetObject: number): TreeNode | null {
    for (const node of tree) {
        if (node.children !== undefined && node.children.length > 0) {
            const findNode = findChildrenRecursively(node.children, targetObject);
            if (findNode) {
                return findNode;
            }
        } else {
            if (node.data.id == targetObject) {
                return node;
            }
        }
    }
    return null;
}


