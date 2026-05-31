import { SeriesProfile } from "./SeriesProfile";
import moment from "moment-timezone";
import type { EChartsOption } from "echarts";
import { syncYAxesWithLegend } from "./legend-axis-sync";
import { applyYAxisLayoutToOptions } from "./y-axis-layout";

export interface ProfileInfo {
  time: moment.Moment;
  pipeName: string;
  pipeId: number;
  serieses: SeriesProfile[];
}

export class Profile {
  pipeId: number;
  pipeName: string;
  serieses: SeriesProfile[];
  currentTime: moment.Moment;
  options: EChartsOption;
  private lastLegendSelected: Record<string, boolean> | null = null;

  constructor(info: ProfileInfo) {
    this.pipeId = info.pipeId;
    this.pipeName = info.pipeName;
    this.serieses = info.serieses;
    this.currentTime = info.time;
    this.options = this.createOptions();
  }

  createOptions(): EChartsOption {
    const axisMap = new Map<string, { series: SeriesProfile; index: number }>();
    let axisIndex = 0;

    const axisOrder = new Map<string, number>();
    this.serieses.forEach((series) => {
      const axisId = series.activeUnit.quantity.name;
      if (!axisOrder.has(axisId)) {
        axisOrder.set(axisId, axisIndex++);
      }
    });

    this.serieses.forEach((series) => {
      const axisId = series.activeUnit.quantity.name;
      if (!axisMap.has(axisId)) {
        axisMap.set(axisId, { series, index: axisOrder.get(axisId)! });
      }
    });

    const limitSeries = this.shouldShowPressureLikeLimits()
      ? this.createLimitSeries(axisMap)
      : [];

    const opt: EChartsOption = {
      backgroundColor: "transparent",
      legend: {
        show: true,
        type: "scroll",
        right: "17%",
        top: "2%",
        textStyle: {
          color: "#ffffff",
          fontSize: 16,
        },
      },
      grid: {
        left: "80px",
        top: "10%",
        bottom: "10%",
      },
      tooltip: {
        show: true,
        trigger: "axis",
        backgroundColor: "#1e293b",
        borderColor: "#1e293b",
        axisPointer: { type: "cross" },
        textStyle: {
          color: "#fff",
        },
        valueFormatter: (value: number | string) => {
          if (typeof value === "string") return value;
          if (!Number.isFinite(value)) return String(value);
          return value.toFixed(3);
        },
      },
      yAxis: Array.from(axisMap.values())
        .sort((a, b) => a.index - b.index)
        .map(({ series }) => ({
          id: series.activeUnit.quantity.name,
          type: "value",
          name: `${series.activeUnit.quantity.displayName}, ${series.activeUnit.displayName}`,
          nameLocation: "center",
          nameTextStyle: {
            color: "#ffffff",
            fontSize: 16,
          },
          offset: 0,
          nameGap: 28,
          position: "left",
          axisLine: {
            show: true,
            lineStyle: {
              color: "#cbd5e1",
            },
          },
          splitLine: {
            lineStyle: { color: "rgba(128,128,128,0.3)" },
          },
          axisLabel: {
            color: "#ffffff",
            fontSize: 14,
            hideOverlap: true,
            formatter: (value: number) => {
              const d = Math.min(6, Math.max(0, series.digits));
              return `${value.toFixed(d)} ${series.activeUnit.displayName}`;
            },
          },
          boundaryGap: ["10%", "10%"],
        })),
      xAxis: [
        {
          type: "value",
          name:
            this.serieses.length > 0
              ? `Длина, ${this.serieses[0].xAxisUnit.displayName}`
              : "Длина, км",
          nameTextStyle: {
            color: "#ffffff",
            fontSize: 16,
          },
          scale: true,
          splitLine: {
            show: true,
            lineStyle: { color: "rgba(128,128,128,0.3)" },
          },
          axisLabel: {
            color: "#f1f5f9",
            fontSize: 15,
            fontWeight: 500,
            hideOverlap: true,
            formatter: (value: number) =>
              typeof value === "number" && Number.isFinite(value) ? value.toFixed(3) : String(value),
          },
        },
      ],
      dataZoom: [
        {
          type: "inside",
          xAxisIndex: 0,
        },
        {
          type: "slider",
          xAxisIndex: 0,
        },
      ],
      series: [...this.serieses.map((s) => s.chartSeries), ...limitSeries],
    };

    applyYAxisLayoutToOptions(opt, this.serieses);
    this.applyXAxisFromDataExtent(opt);
    return opt;
  }

  /** Минимальное и максимальное расстояние по всем рядам. */
  private getSeriesDistanceExtent(): { min: number; max: number } | null {
    let min = Infinity;
    let max = -Infinity;
    for (const s of this.serieses) {
      const data = s.chartSeries.data as [number, number][] | undefined;
      if (!data?.length) continue;
      for (const row of data) {
        const x = row[0];
        if (typeof x === "number" && Number.isFinite(x)) {
          min = Math.min(min, x);
          max = Math.max(max, x);
        }
      }
    }
    if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) {
      return null;
    }
    return { min, max };
  }

  /** Сжимает ось X до реального диапазона расстояний (без пустого места справа). */
  private applyXAxisFromDataExtent(options: EChartsOption): void {
    if (!options.xAxis || !Array.isArray(options.xAxis)) return;
    const xa = options.xAxis[0] as Record<string, unknown>;
    const ext = this.getSeriesDistanceExtent();
    if (!ext) {
      options.xAxis[0] = { ...xa, boundaryGap: [0, 0] };
      return;
    }
    options.xAxis[0] = {
      ...xa,
      min: ext.min,
      max: ext.max,
      boundaryGap: [0, 0],
    };
  }

  /** Логику лимитов 60–140 оставляем для давления/температуры; для профиля «высота» по трассе — без лимитов. */
  private shouldShowPressureLikeLimits(): boolean {
    if (this.serieses.length === 0) return false;
    return !this.serieses.every(
      (s) => s.activeUnit.quantity.name === "Height"
    );
  }

  private createLimitSeries(axisMap: Map<string, { series: SeriesProfile; index: number }>): any[] {
    const limitSeries: any[] = [];
    const minLimit = 60;
    const maxLimit = 140;

    const ext = this.getSeriesDistanceExtent();
    const x0 = ext?.min ?? 0;
    const x1 = ext?.max ?? 10;
    const numPoints = 100;
    const distancePoints: number[] = [];
    if (numPoints < 2 || x1 <= x0) {
      distancePoints.push(x0);
    } else {
      for (let i = 0; i < numPoints; i++) {
        distancePoints.push(x0 + ((x1 - x0) * i) / (numPoints - 1));
      }
    }

    Array.from(axisMap.values()).forEach(({ series }) => {
      const axisId = series.activeUnit.quantity.name;

      limitSeries.push({
        yAxisId: axisId,
        name: `Мин. лимит (${minLimit})`,
        type: "line",
        data: distancePoints.map((distance) => [distance, minLimit]),
        lineStyle: {
          color: "#ff4757",
          width: 2,
          type: "dashed",
        },
        symbol: "none",
        silent: true,
        legend: {
          show: false,
        },
        tooltip: {
          show: false,
        },
      });

      limitSeries.push({
        yAxisId: axisId,
        name: `Макс. лимит (${maxLimit})`,
        type: "line",
        data: distancePoints.map((distance) => [distance, maxLimit]),
        lineStyle: {
          color: "#ff4757",
          width: 2,
          type: "dashed",
        },
        symbol: "none",
        silent: true,
        legend: {
          show: false,
        },
        tooltip: {
          show: false,
        },
      });
    });

    return limitSeries;
  }

  setTime(currentTime: moment.Moment) {
    this.currentTime = currentTime;
  }

  async refresh(): Promise<void> {
    for (const series of this.serieses) {
      await series.refresh(this.currentTime);
    }
    this.updateOptions();
  }

  updateOptions(): void {
    const axisMap = new Map<string, { series: SeriesProfile; index: number }>();
    let axisIndex = 0;

    const axisOrder = new Map<string, number>();
    this.serieses.forEach((series) => {
      const axisId = series.activeUnit.quantity.name;
      if (!axisOrder.has(axisId)) {
        axisOrder.set(axisId, axisIndex++);
      }
    });

    this.serieses.forEach((series) => {
      const axisId = series.activeUnit.quantity.name;
      if (!axisMap.has(axisId)) {
        axisMap.set(axisId, { series, index: axisOrder.get(axisId)! });
      }
    });

    const limitSeries = this.shouldShowPressureLikeLimits()
      ? this.createLimitSeries(axisMap)
      : [];
    this.options.series = [...this.serieses.map((s) => s.chartSeries), ...limitSeries];
    if (this.options.yAxis && Array.isArray(this.options.yAxis) && this.options.yAxis.length > 0) {
      this.refreshYAxisOffsets();
    }
    if (this.lastLegendSelected) {
      this.options = syncYAxesWithLegend(this.options, this.serieses, this.lastLegendSelected);
    }
    this.applyXAxisFromDataExtent(this.options);
  }

  syncAxesWithLegend(selected: Record<string, boolean>): void {
    this.lastLegendSelected = selected;
    this.options = syncYAxesWithLegend(this.options, this.serieses, selected);
    this.applyXAxisFromDataExtent(this.options);
  }

  refreshYAxisOffsets(): void {
    applyYAxisLayoutToOptions(this.options, this.serieses);
  }
}
