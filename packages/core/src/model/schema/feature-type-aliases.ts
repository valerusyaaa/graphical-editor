/** Канонические коды типов в редакторе (совпадают с классами бэкенда EditedJSON). */
export const CANONICAL_FEATURE = {
	Producer: "Producer",
	Consumer: "consumer",
	Pipe: "pipe",
	Valve: "Valve",
	Monitor: "Monitor",
} as const;

const TO_CANONICAL: Record<string, string> = {
	supplier: CANONICAL_FEATURE.Producer,
	producer: CANONICAL_FEATURE.Producer,
	Producer: CANONICAL_FEATURE.Producer,
	PROVIDER: CANONICAL_FEATURE.Producer,
	consumer: CANONICAL_FEATURE.Consumer,
	Consumer: CANONICAL_FEATURE.Consumer,
	CONSUMER: CANONICAL_FEATURE.Consumer,
	pipe: CANONICAL_FEATURE.Pipe,
	Pipe: CANONICAL_FEATURE.Pipe,
	"PIPE-MAIN-001": CANONICAL_FEATURE.Pipe,
	PIPELINE: CANONICAL_FEATURE.Pipe,
	gate_valve: CANONICAL_FEATURE.Valve,
	valve: CANONICAL_FEATURE.Valve,
	Valve: CANONICAL_FEATURE.Valve,
	VALVE: CANONICAL_FEATURE.Valve,
	GateValve: CANONICAL_FEATURE.Valve,
	Monitor: CANONICAL_FEATURE.Monitor,
};

/** Приводит legacy-коды (`supplier`, `gate_valve`) к каноническим (`Producer`, `Valve`). */
export function canonicalFeatureType(code: string): string {
	const key = code.trim();
	return TO_CANONICAL[key] ?? TO_CANONICAL[key.toLowerCase()] ?? key;
}

export function isProducerFeature(code: string): boolean {
	return canonicalFeatureType(code) === CANONICAL_FEATURE.Producer;
}

export function isConsumerFeature(code: string): boolean {
	return canonicalFeatureType(code) === CANONICAL_FEATURE.Consumer;
}

export function isPipeFeature(code: string): boolean {
	return canonicalFeatureType(code) === CANONICAL_FEATURE.Pipe;
}

export function isValveFeature(code: string): boolean {
	return canonicalFeatureType(code) === CANONICAL_FEATURE.Valve;
}

export function isMonitorFeature(code: string): boolean {
	return canonicalFeatureType(code) === CANONICAL_FEATURE.Monitor;
}
