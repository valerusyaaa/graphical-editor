import type { ObjectDescription } from "../../../packages/core/src/api/types";

export const baseDescriptors: ObjectDescription[] = [
	{
		featureObjectType: "pipe",
		graphObjectType: "linear",
		thikness: 10,
		strokeWidth: 1,
		fillColor: "blue",
		strokeColor: "blue",
	},
	{
		featureObjectType: "valve",
		graphObjectType: "pointer",
		thikness: 10,
		strokeWidth: 1,
		offsets: {
			top: 0,
			left: 0,
		},
		polynom: [
			{ x: 20, y: 75 },
			{ x: 50, y: 50 },
			{ x: 80, y: 75 },
			{ x: 80, y: 25 },
			{ x: 50, y: 50 },
			{ x: 20, y: 25 },
		],
		fillColor: "red",
		strokeColor: "blue",
	},
];
