/** Округление чисел расчёта и отображение в панели свойств / на мониторе. */
export const RESULT_DECIMAL_PLACES = 10;

const NUMERIC_STRING = /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/;

export function isNumericPropertyString(value: string): boolean {
	const s = value.trim();
	return s !== "" && NUMERIC_STRING.test(s);
}

/** Округляет число до `places` знаков после запятой (строка без лишних нулей). */
export function roundNumericToString(
	value: string | number,
	places = RESULT_DECIMAL_PLACES,
): string {
	if (typeof value === "number") {
		if (!Number.isFinite(value)) return String(value);
		return String(parseFloat(value.toFixed(places)));
	}
	const s = value.trim();
	if (!isNumericPropertyString(s)) return value;
	const n = Number(s);
	if (!Number.isFinite(n)) return value;
	return String(parseFloat(n.toFixed(places)));
}

/** Для полей «Результаты» и других read-only после расчёта. */
export function formatReadOnlyPropertyValue(raw: string): string {
	return roundNumericToString(raw);
}
