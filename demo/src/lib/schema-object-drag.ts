import type { ObjectBaseData } from "../../../packages/core/src/api/types";
import {
	isObjectFixedOnScheme,
	readBackendProperties,
} from "../../../packages/core/src/lib/object-fixed-on-scheme";

export function isSchemeObjectDragBlocked(data: ObjectBaseData | undefined): boolean {
	return isObjectFixedOnScheme(readBackendProperties(data));
}
