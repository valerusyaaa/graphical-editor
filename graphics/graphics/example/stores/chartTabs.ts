import { defineStore } from "pinia";

export type ChartKind = "profiles" | "trends";

export interface ChartTab {
  id: number;
  objectId: number;
  kind: ChartKind;
  title: string;
}

let nextTabId = 1;

export const useChartTabsStore = defineStore("chartTabs", {
  state: () => ({
    tabs: [] as ChartTab[],
    activeTabId: null as number | null,
  }),
  getters: {
    activeTab(state): ChartTab | null {
      if (state.activeTabId === null) return null;
      return state.tabs.find((t) => t.id === state.activeTabId) ?? null;
    },
  },
  actions: {
    /**
     * Открыть график или переключиться на уже открытый (одна вкладка на пару объект+тип).
     */
    openTab(objectId: number, kind: ChartKind, title: string) {
      const existing = this.tabs.find((t) => t.objectId === objectId && t.kind === kind);
      if (existing) {
        this.activeTabId = existing.id;
        return;
      }
      const id = nextTabId++;
      this.tabs.push({ id, objectId, kind, title });
      this.activeTabId = id;
    },

    closeTab(tabId: number) {
      const i = this.tabs.findIndex((t) => t.id === tabId);
      if (i === -1) return;
      this.tabs.splice(i, 1);
      if (this.activeTabId === tabId) {
        const next = this.tabs[i] ?? this.tabs[i - 1] ?? null;
        this.activeTabId = next?.id ?? null;
      }
    },

    setActive(tabId: number) {
      if (this.tabs.some((t) => t.id === tabId)) {
        this.activeTabId = tabId;
      }
    },
  },
});
