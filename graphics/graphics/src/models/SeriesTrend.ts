import { SeriesBase, type Unit } from "./SeriesBase";
import moment from "moment-timezone";

const round3 = (n: number) => Math.round(n * 1000) / 1000;

export interface TimePoint {
  time: Date;
  value: number;
}

export class SeriesTrend extends SeriesBase {
  group: string;

  constructor(
    title: string,
    group: string,
    digits: number,
    unit: Unit,
    color: string | null,
    isStep: boolean = false
  ) {
    super({
      title: `[${group}] ${title}`,
      color,
      chartSeries: {
        yAxisId: unit.quantity.name,
        name: `[${group}] ${title}`,
        type: "line",
        step: isStep ? "start" : false,
        color: color ?? "#5470c6",
        lineStyle: {
          width: 2,
        },
        data: [],
      },
      activeUnit: unit,
      digits,
      isStep,
    });
    this.group = group;
  }

  async refresh(startTime: moment.Moment, endTime: moment.Moment): Promise<void> {
    const points = await this.generateRandomData(startTime, endTime);
    this.chartSeries.data = points.map((p) => [p.time, p.value]);
  }

  private async generateRandomData(
    startTime: moment.Moment,
    endTime: moment.Moment
  ): Promise<TimePoint[]> {
    const points: TimePoint[] = [];
    const durationHours = endTime.diff(startTime, "hours");
    const numPoints = Math.max(Math.min(Math.floor(durationHours), 100), 24);
    const spanMs = endTime.valueOf() - startTime.valueOf();

    const baseValue = 100;
    const variation = 10;
    let lastValue = baseValue;

    if (spanMs <= 0 || numPoints < 2) {
      return [{ time: startTime.toDate(), value: round3(baseValue) }];
    }

    for (let i = 0; i < numPoints; i++) {
      const tMs = startTime.valueOf() + (spanMs * i) / (numPoints - 1);
      const change = (Math.random() - 0.5) * variation * 2;
      lastValue = Math.max(baseValue - variation * 2, Math.min(baseValue + variation * 2, lastValue + change));
      const value = lastValue + (Math.random() - 0.5) * variation;

      points.push({
        time: new Date(tMs),
        value: round3(value),
      });
    }

    return points;
  }
}
