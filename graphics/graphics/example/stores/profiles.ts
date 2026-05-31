import { defineStore } from "pinia";
import moment from "moment-timezone";
import { Profile, SeriesProfile } from "charts-for-diplom";
import type { Unit } from "charts-for-diplom";
import { ElMessage } from "element-plus";

type UnitPayload = {
  name?: string;
  Name?: string;
  displayName?: string;
  DisplayName?: string;
  quantity?: {
    name?: string;
    Name?: string;
    displayName?: string;
    DisplayName?: string;
  };
  Quantity?: {
    name?: string;
    Name?: string;
    displayName?: string;
    DisplayName?: string;
  };
};

type ApiProfileSeries = {
  title?: string;
  Title?: string;
  color?: string | null;
  Color?: string | null;
  digits?: number;
  Digits?: number;
  unit?: UnitPayload;
  Unit?: UnitPayload;
  xAxisUnit?: UnitPayload;
  XAxisUnit?: UnitPayload;
  points?: ApiProfilePoint[];
  Points?: ApiProfilePoint[];
};

type ApiProfilePoint = {
  distanceKm?: number;
  DistanceKm?: number;
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

function mapProfileSeries(row: ApiProfileSeries): SeriesProfile {
  const title = row.title ?? row.Title ?? "";
  const digits = row.digits ?? row.Digits ?? 3;
  const color = row.color ?? row.Color ?? "#5470c6";
  const unitPayload = row.unit ?? row.Unit;
  const xPayload = row.xAxisUnit ?? row.XAxisUnit;
  if (!unitPayload || !xPayload) {
    throw new Error("profile series.unit / xAxisUnit");
  }
  const unit = mapUnitPayload(unitPayload);
  const xAxisUnit = mapUnitPayload(xPayload);
  const sp = new SeriesProfile(title, unit, color, digits, xAxisUnit);
  const pts = row.points ?? row.Points ?? [];
  sp.chartSeries.data = pts.map((p) => {
    const d = p.distanceKm ?? p.DistanceKm ?? 0;
    const v = p.value ?? p.Value ?? 0;
    return [d, v] as [number, number];
  });
  return sp;
}

export const useProfilesStore = defineStore("profiles", {
  state: () => ({
    idProfile: null as number | null,
    activeProfile: undefined as Profile | undefined,
    chartLayoutRevision: 0,
    loading: false,
  }),
  actions: {
    async fetchProfile(objectId: number) {
      const config = useRuntimeConfig();
      this.loading = true;
      try {
        const at = new Date().toISOString();
        const payload = (await $fetch(
          `${config.public.apiBase}/objects/${objectId}/profile`,
          { query: { at } }
        )) as {
          pipeId?: number;
          PipeId?: number;
          pipeName?: string;
          PipeName?: string;
          time?: string;
          Time?: string;
          series?: ApiProfileSeries[];
          Series?: ApiProfileSeries[];
        };

        const pipeId = payload.pipeId ?? payload.PipeId ?? objectId;
        const pipeName = payload.pipeName ?? payload.PipeName ?? "";
        const timeIso = payload.time ?? payload.Time;
        const seriesRaw = payload.series ?? payload.Series ?? [];
        const serieses = seriesRaw.map(mapProfileSeries);
        const profile = new Profile({
          time: timeIso ? moment(timeIso) : moment(),
          pipeName,
          pipeId,
          serieses,
        });
        this.activeProfile = profile;
        this.idProfile = objectId;
        this.chartLayoutRevision++;
      } catch (e) {
        console.error(e);
        ElMessage.error("Не удалось загрузить профиль");
        this.activeProfile = undefined;
        this.idProfile = null;
      } finally {
        this.loading = false;
      }
    },

    onRefresh() {
      if (this.idProfile != null) {
        return this.fetchProfile(this.idProfile);
      }
    },

    applyProfileLegendSelected(selected: Record<string, boolean>) {
      if (!this.activeProfile) return;
      this.activeProfile.syncAxesWithLegend(selected);
      this.chartLayoutRevision++;
    },
  },
});
