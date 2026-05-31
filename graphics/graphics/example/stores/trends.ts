import { defineStore } from "pinia";
import moment from "moment-timezone";
import { Trend, SeriesTrend } from "charts-for-diplom";
import type { Unit } from "charts-for-diplom";
import { ElMessage } from "element-plus";

function defaultRangeIso(): { rangeFromIso: string; rangeToIso: string } {
  const to = new Date();
  const from = new Date(to.getTime() - 7 * 86400000);
  return { rangeFromIso: from.toISOString(), rangeToIso: to.toISOString() };
}

type ApiTrendSeries = {
  title?: string;
  Title?: string;
  group?: string;
  Group?: string;
  color?: string | null;
  Color?: string | null;
  digits?: number;
  Digits?: number;
  unit?: UnitPayload;
  Unit?: UnitPayload;
  style?: { step?: boolean };
  Style?: { Step?: boolean; step?: boolean };
  points?: ApiPoint[];
  Points?: ApiPoint[];
};

type UnitPayload = {
  name?: string;
  Name?: string;
  displayName?: string;
  DisplayName?: string;
  quantity?: { name?: string; Name?: string; displayName?: string; DisplayName?: string };
  Quantity?: { name?: string; Name?: string; displayName?: string; DisplayName?: string };
};

type ApiPoint = {
  time?: string;
  Time?: string;
  value?: number;
  Value?: number;
};

function mapUnitPayload(u: UnitPayload): Unit {
  const q = u.quantity ?? u.Quantity ?? {};
  return {
    name: u.name ?? u.Name ?? "",
    displayName: u.displayName ?? u.DisplayName ?? "",
    quantity: {
      name: q.name ?? q.Name ?? "",
      displayName: q.displayName ?? q.DisplayName ?? "",
    },
  };
}

function mapSeries(row: ApiTrendSeries): SeriesTrend {
  const title = row.title ?? row.Title ?? "";
  const group = row.group ?? row.Group ?? "";
  const digits = row.digits ?? row.Digits ?? 3;
  const color = row.color ?? row.Color ?? "#5470c6";
  const unitPayload = row.unit ?? row.Unit;
  if (!unitPayload) {
    throw new Error("series.unit");
  }
  const unit = mapUnitPayload(unitPayload);
  const step =
    row.style?.step ?? row.Style?.Step ?? row.Style?.step ?? false;
  const st = new SeriesTrend(title, group, digits, unit, color, Boolean(step));
  const pts = row.points ?? row.Points ?? [];
  st.chartSeries.data = pts.map((p) => {
    const ts = p.time ?? p.Time;
    const v = p.value ?? p.Value ?? 0;
    const ms = new Date(ts!).getTime();
    return [ms, v] as [number, number];
  });
  return st;
}

export const useTrendsStore = defineStore("trends", {
  state: () => ({
    idTrend: null as number | null,
    activeTrend: null as Trend | null,
    /** Счётчик для перерисовки: класс Trend не глубоко реактивен в Pinia. */
    chartLayoutRevision: 0,
    ...defaultRangeIso(),
    loading: false,
  }),
  getters: {
    groups: (state) => {
      if (!state.activeTrend) return [];
      const groupsMap = new Map<string, { index: number; serieses: SeriesTrend[] }>();
      let index = 0;

      state.activeTrend.serieses.forEach((series) => {
        const key = series.group;
        if (!groupsMap.has(key)) {
          groupsMap.set(key, { index: index++, serieses: [series] });
        } else {
          groupsMap.get(key)!.serieses.push(series);
        }
      });

      return Array.from(groupsMap.entries());
    },
  },
  actions: {
    async fetchTrend(objectId: number) {
      const config = useRuntimeConfig();
      const from = new Date(this.rangeFromIso);
      const to = new Date(this.rangeToIso);
      if (!(from < to)) {
        ElMessage.warning("Укажите корректный интервал: начало раньше конца.");
        return;
      }

      this.loading = true;
      try {
        const data = (await $fetch(
          `${config.public.apiBase}/objects/${objectId}/trend`,
          {
            params: {
              from: from.toISOString(),
              to: to.toISOString(),
            },
          }
        )) as {
          series?: ApiTrendSeries[];
          Series?: ApiTrendSeries[];
          from?: string;
          From?: string;
          to?: string;
          To?: string;
        };

        const rawSeries = data.series ?? data.Series ?? [];
        const serieses = rawSeries.map(mapSeries);
        const fromIso = data.from ?? data.From ?? from.toISOString();
        const toIso = data.to ?? data.To ?? to.toISOString();

        this.rangeFromIso = new Date(fromIso).toISOString();
        this.rangeToIso = new Date(toIso).toISOString();

        const trend = new Trend({
          startTime: moment.utc(this.rangeFromIso),
          endTime: moment.utc(this.rangeToIso),
          serieses,
        });

        this.$patch({
          activeTrend: trend,
          idTrend: objectId,
        });
      } catch (e) {
        console.error(e);
        this.activeTrend = null;
        ElMessage.error(
          "Не удалось загрузить тренд. Запущен ли сервис data-service (порт 5000)?"
        );
      } finally {
        this.loading = false;
      }
    },

    onRefresh() {
      /* зарезервировано под автообновление */
    },

    applyTrendLegendSelected(selected: Record<string, boolean>) {
      if (!this.activeTrend) return;
      this.activeTrend.syncAxesWithLegend(selected);
      this.chartLayoutRevision++;
    },
  },
});
