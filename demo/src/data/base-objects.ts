export type DemoApiPointerObject = {
	id: number;
	kind: "Valve";
	position: { x: number; y: number };
	techObjectId: number;
};

export type DemoApiSupplierObject = {
	id: number;
	kind: "Producer";
	position: { x: number; y: number };
	techObjectId: number;
};

export type DemoApiConsumerObject = {
	id: number;
	kind: "consumer";
	position: { x: number; y: number };
	techObjectId: number;
};

export type DemoApiLinearObject = {
	id: number;
	kind: "pipe";
	points: { x: number; y: number }[];
	techObjectId: number;
};

export type DemoApiObject =
	| DemoApiPointerObject
	| DemoApiSupplierObject
	| DemoApiConsumerObject
	| DemoApiLinearObject;

export const baseApiObjects: DemoApiObject[] = [
	{
		id: 1,
		kind: "Valve",
		position: { x: 100, y: 100 },
		techObjectId: 1,
	},
	{
		id: 2,
		kind: "pipe",
		points: [
			{ x: 186, y: 150 },
			{ x: 320, y: 150 },
		],
		techObjectId: 2,
	},
	{
		id: 3,
		kind: "Producer",
		position: { x: 380, y: 90 },
		techObjectId: 3,
	},
	{
		id: 4,
		kind: "consumer",
		position: { x: 460, y: 90 },
		techObjectId: 4,
	},
];
