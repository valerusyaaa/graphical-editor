export type DemoApiPointerObject = {
	id: number;
	kind: "valve";
	position: { x: number; y: number };
	techObjectId: number;
};

export type DemoApiLinearObject = {
	id: number;
	kind: "pipe";
	points: { x: number; y: number }[];
	techObjectId: number;
};

export type DemoApiObject = DemoApiPointerObject | DemoApiLinearObject;

export const baseApiObjects: DemoApiObject[] = [
	{
		id: 1,
		kind: "valve",
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
];
