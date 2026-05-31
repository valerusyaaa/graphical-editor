import { defineStore } from "pinia";

function normalizeKind(o: { kind?: string; Kind?: string }): string {
  return (o.kind ?? o.Kind ?? "standard").toLowerCase();
}

export interface ExplorerObject {
  id: number;
  name: string;
  /** standard — кран/узел; pipeline — труба (только профиль высоты по длине). */
  kind?: string;
  properties?: ObjectProperty[];
}

export interface ObjectProperty {
  key: string;
  displayName: string;
  value: string;
  unit?: string | null;
}

export const useExplorerStore = defineStore("explorer", {
  state: () => ({
    objects: [] as ExplorerObject[],
    /** По умолчанию — первый объект из проводника */
    selectedObjectId: null as number | null,
  }),
  getters: {
    selectedObject: (state): ExplorerObject | null => {
      return state.objects.find((obj) => obj.id === state.selectedObjectId) || null;
    },
    selectedObjectProperties(): ObjectProperty[] {
      return this.selectedObject?.properties ?? [];
    },
  },
  actions: {
    async fetchObjects() {
      const config = useRuntimeConfig();
      const payload = (await $fetch(`${config.public.apiBase}/objects`)) as {
        objects?: ExplorerObject[];
        Objects?: ExplorerObject[];
      };
      const objects = payload.objects ?? payload.Objects ?? [];
      this.objects = objects;
      if (!this.selectedObjectId || !objects.some((x) => x.id === this.selectedObjectId)) {
        this.selectedObjectId = objects[0]?.id ?? null;
      }
    },

    async fetchObjectProperties(objectId: number) {
      const config = useRuntimeConfig();
      const payload = (await $fetch(`${config.public.apiBase}/objects/${objectId}/properties`)) as {
        properties?: ObjectProperty[];
        Properties?: ObjectProperty[];
      };
      const properties = payload.properties ?? payload.Properties ?? [];
      const target = this.objects.find((o) => o.id === objectId);
      if (target) {
        target.properties = properties;
      }
    },

    /** Подсветка объекта в списке (без снятия выбора повторным кликом) */
    async selectObject(objectId: number) {
      this.selectedObjectId = objectId;
      await this.fetchObjectProperties(objectId);
    },
    addObject(name: string) {
      const newId = Math.max(...this.objects.map((o) => o.id), 0) + 1;
      this.objects.push({ id: newId, name, kind: "standard" });
    },
    removeObject(objectId: number) {
      const index = this.objects.findIndex((o) => o.id === objectId);
      if (index !== -1) {
        this.objects.splice(index, 1);
        if (this.selectedObjectId === objectId) {
          this.selectedObjectId = null;
        }
      }
    },
  },
});





