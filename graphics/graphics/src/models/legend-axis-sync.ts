import type { EChartsOption } from "echarts";
import type { SeriesBase } from "./SeriesBase";
import { computeYAxisLayout } from "./y-axis-layout";

/** Ряд с физической величиной и именем в легенде (тренд / профиль). */
export type LegendAxisSeries = {
  chartSeries: { name?: string; yAxisId?: string };
  activeUnit: { quantity: { name: string } };
};

/**
 * Скрывает Y-ось и вспомогательные (silent) ряды на ней, если все основные ряды
 * с этой величиной выключены в легенде. Иначе лимиты оставляют ось на экране.
 */
export function syncYAxesWithLegend(
  options: EChartsOption,
  serieses: LegendAxisSeries[],
  selected: Record<string, boolean>
): EChartsOption {
  const axisVisible = new Map<string, boolean>();
  for (const s of serieses) {
    const name = String(s.chartSeries.name ?? "");
    const legendOn = selected[name] !== false;
    const axisId = s.activeUnit.quantity.name;
    axisVisible.set(axisId, (axisVisible.get(axisId) ?? false) || legendOn);
  }

  const visibleForLayout = serieses.filter((s) => axisVisible.get(s.activeUnit.quantity.name)) as SeriesBase[];
  const { offsetByAxisId, gridLeftPx } = computeYAxisLayout(visibleForLayout);
  const gridLeft = Math.max(80, gridLeftPx);

  const yAxis = ((options.yAxis ?? []) as object[]).map((axis: Record<string, unknown>) => {
    const id = String(axis.id ?? "");
    const show = axisVisible.get(id) === true;
    const offset = show ? (offsetByAxisId.get(id) ?? 0) : 0;
    const axisLabel =
      typeof axis.axisLabel === "object" && axis.axisLabel !== null
        ? { ...(axis.axisLabel as object), hideOverlap: true }
        : { hideOverlap: true };
    return { ...axis, show, offset, nameGap: 28, axisLabel };
  });

  const series = ((options.series ?? []) as object[]).map((ser: Record<string, unknown>) => {
    if (ser.silent === true && ser.yAxisId != null) {
      const show = axisVisible.get(String(ser.yAxisId)) === true;
      return { ...ser, show };
    }
    return ser;
  });

  return {
    ...options,
    yAxis,
    series,
    grid: { ...(options.grid as object), left: `${gridLeft}px` },
  };
}
