import { defineStore } from "pinia";
import type { GraphicObjectDto, ObjectBaseData, PipePortLink } from "../../../packages/core/src/api/types";
import {
	getConsumerInletWorld,
	getGateValvePortWorld,
	getSupplierOutletWorld,
	hitTestConsumer,
	hitTestGateValve,
	hitTestSupplier,
	type XY,
} from "../lib/pipe-anchors";

function nextObjectId(objects: GraphicObjectDto<ObjectBaseData>[]): number {
	if (!objects.length) return 1;
	return Math.max(...objects.map((o) => o.id)) + 1;
}

function nextTechObjectId(objects: GraphicObjectDto<ObjectBaseData>[]): number {
	let m = 0;
	for (const o of objects) {
		const id = o.data?.techObjectId;
		if (typeof id === "number" && id > m) m = id;
	}
	return m + 1;
}

type Phase = "idle" | "need-start" | "need-end";

export const usePipeDrawStore = defineStore("pipe-draw", {
	state: () => ({
		phase: "idle" as Phase,
		startWorld: { x: 0, y: 0 } as XY,
		startLink: undefined as PipePortLink | undefined,
		/** id типа из метамодели (`PIPE-MAIN-001` и т.д.). */
		pipeObjectTypeId: undefined as string | undefined,
	}),
	actions: {
		beginFromPalette(pipeObjectTypeId?: string) {
			this.phase = "need-start";
			this.startLink = undefined;
			this.pipeObjectTypeId = pipeObjectTypeId;
		},
		cancel() {
			this.phase = "idle";
			this.pipeObjectTypeId = undefined;
		},
		/**
		 * Два клика по canvas после выбора трубы с палитры: начало и конец.
		 * Привязка: поставщик (правый порт), кран (левый/правый), потребитель (левый порт).
		 */
		handleCanvasWorldClick(
			world: XY,
			objects: GraphicObjectDto<ObjectBaseData>[],
			commit: (next: GraphicObjectDto<ObjectBaseData>[]) => void,
			pipeObjectTypeId: string | undefined,
		): boolean {
			if (this.phase === "idle") return false;

			if (this.phase === "need-start") {
				const sup = hitTestSupplier(objects, world);
				if (sup?.position) {
					this.startWorld = getSupplierOutletWorld(sup.position);
					this.startLink = { objectId: sup.id, junction: 0 };
				} else {
					const gv = hitTestGateValve(objects, world);
					if (gv?.object.position) {
						this.startWorld = getGateValvePortWorld(
							gv.object.position,
							gv.junction,
						);
						this.startLink = {
							objectId: gv.object.id,
							junction: gv.junction,
						};
					} else {
						this.startWorld = { ...world };
						this.startLink = undefined;
					}
				}
				this.phase = "need-end";
				return true;
			}

			if (this.phase === "need-end") {
				const con = hitTestConsumer(objects, world);
				let endWorld: XY;
				let endLink: PipePortLink | undefined;
				if (con?.position) {
					endWorld = getConsumerInletWorld(con.position);
					endLink = { objectId: con.id, junction: 0 };
				} else {
					const gv = hitTestGateValve(objects, world);
					if (gv?.object.position) {
						endWorld = getGateValvePortWorld(gv.object.position, gv.junction);
						endLink = { objectId: gv.object.id, junction: gv.junction };
					} else {
						endWorld = { ...world };
						endLink = undefined;
					}
				}

				const id = nextObjectId(objects);
				const techObjectId = nextTechObjectId(objects);
				const hasTopo = this.startLink || endLink;
				const nextObj: GraphicObjectDto<ObjectBaseData> = {
					id,
					featureObjectType: "pipe",
					graphObjectType: "linear",
					points: [
						{ ...this.startWorld },
						{ ...endWorld },
					],
					data: {
						techObjectId,
						objectTypeId: pipeObjectTypeId,
						...(hasTopo
							? {
									pipeTopology: {
										start: this.startLink,
										end: endLink,
									},
								}
							: {}),
					},
				};
				commit([...objects, nextObj]);
				this.phase = "idle";
				this.pipeObjectTypeId = undefined;
				return true;
			}

			return false;
		},
	},
});
