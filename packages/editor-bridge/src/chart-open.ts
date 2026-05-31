export type ChartOpenItemMessage = {
	chartObjectId: number;
	chartKind: "profiles" | "trends";
	title: string;
	schemeObjectId: number;
};

export const PENDING_CHARTS_OPEN_STORAGE_KEY = "ge-pending-charts-open";

export const EDITOR_CHARTS_OPEN_MESSAGE = "editor-open-charts" as const;
