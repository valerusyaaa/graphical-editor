import { SeriesBase, type Unit } from "./SeriesBase";
import moment from "moment-timezone";

const round3 = (n: number) => Math.round(n * 1000) / 1000;

export interface LinearPoint {
  distance: number;
  value: number;
}

export class SeriesProfile extends SeriesBase {
  xAxisUnit: Unit;

  constructor(
    title: string,
    unit: Unit,
    color: string | null,
    digits: number,
    xAxisUnit: Unit
  ) {
    super({
      title,
      color,
      chartSeries: {
        yAxisId: unit.quantity.name,
        name: title,
        type: "line",
        color: color ?? "#5470c6",
        lineStyle: {
          width: 2,
        },
        data: [],
      },
      activeUnit: unit,
      digits,
    });
    this.xAxisUnit = xAxisUnit;
  }

  async refresh(time: moment.Moment): Promise<void> {
    const points = await this.generateRandomData();
    this.chartSeries.data = points.map((p) => [p.distance, p.value]);
  }

  private async generateRandomData(): Promise<LinearPoint[]> {
    const points: LinearPoint[] = [];
    const numPoints = 100;

    const baseValue = 100; // базовое значение
    const variation = 10; // разброс ±10
    let lastValue = baseValue;

    for (let i = 0; i < numPoints; i++) {
      const distance = i * 0.1; // от 0 до 10 км
      // Плавное изменение с небольшим случайным отклонением
      const change = (Math.random() - 0.5) * variation * 2; // от -variation до +variation
      lastValue = Math.max(baseValue - variation * 2, Math.min(baseValue + variation * 2, lastValue + change));
      const value = lastValue + (Math.random() - 0.5) * variation; // дополнительное небольшое отклонение

      points.push({ distance: round3(distance), value: round3(value) });
    }

    return points;
  }
}
