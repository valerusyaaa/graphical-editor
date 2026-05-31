import type { ObjectDescription } from "../../../packages/core/src/api/types";
import {
	CONSUMER_POINTER_SIDE,
	getConsumerOuterPolynom,
} from "../../../packages/core/src/model/schema/pointer/pointer-graphic-object";

export const baseDescriptors: ObjectDescription[] = [
	{
		featureObjectType: "pipe",
		graphObjectType: "linear",
		thikness: 10,
		strokeWidth: 1,
		fillColor: "#858585",
		strokeColor: "#858585",
		selectionStrokeColor: "#93c5fd",
	},
	{
		featureObjectType: "Valve",
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
		fillColor: "#ef4444",
		strokeColor: "#b91c1c",
		selectionStrokeColor: "#fca5a5",
	},
	{
		featureObjectType: "Producer",
		graphObjectType: "pointer",
		thikness: 10,
		strokeWidth: 2,
		offsets: { top: 0, left: 0 },
		/** Контур квадрата: hit-area и outline selection. */
		polynom: [
			{ x: 0, y: 0 },
			{ x: 48, y: 0 },
			{ x: 48, y: 48 },
			{ x: 0, y: 48 },
		],
		fillColor: "#a3a3a3",
		strokeColor: "#000000",
		selectionStrokeColor: "#93c5fd",
	},
	{
		featureObjectType: "consumer",
		graphObjectType: "pointer",
		thikness: 10,
		strokeWidth: 2,
		offsets: { top: 0, left: 0 },
		polynom: getConsumerOuterPolynom(CONSUMER_POINTER_SIDE),
		fillColor: "#a3a3a3",
		strokeColor: "#000000",
		selectionStrokeColor: "#fca5a5",
	},
	{
		featureObjectType: "Monitor",
		graphObjectType: "pointer",
		thikness: 4,
		strokeWidth: 1,
		offsets: { top: 0, left: 0 },
		polynom: [
			{ x: 0, y: 0 },
			{ x: 118, y: 0 },
			{ x: 118, y: 72 },
			{ x: 0, y: 72 },
		],
		fillColor: "transparent",
		strokeColor: "#333333",
		selectionStrokeColor: "#93c5fd",
	},
];
