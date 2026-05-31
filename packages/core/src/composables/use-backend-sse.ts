import {
	computed,
	onUnmounted,
	readonly,
	ref,
	shallowRef,
	watch,
	type MaybeRefOrGetter,
	toValue,
} from "vue";

export type BackendSseConnectionState =
	| "idle"
	| "connecting"
	| "open"
	| "closed"
	| "error";

export interface UseBackendSseOptions {
	/** Полный URL или путь от корня сайта, например `/api/dev/sse-mock`. Пустая строка — не подключаться */
	url: MaybeRefOrGetter<string>;
	/** По умолчанию true; можно выключить без смены URL */
	enabled?: MaybeRefOrGetter<boolean>;
	withCredentials?: boolean;
	/** Ключ — значение поля `event:` в потоке SSE, например `{ progress: (e) => ... }` */
	namedHandlers?: Record<string, (ev: MessageEvent) => void>;
	/** Событие по умолчанию (`event: message` / без имени). `data` пробуется распарсить как JSON */
	onJsonMessage?: (data: unknown, ev: MessageEvent) => void;
	onOpen?: () => void;
	onError?: (ev: Event) => void;
}

function isAllowedSseUrl(url: string): boolean {
	if (!url) return false;
	if (url.startsWith("/")) return true;
	if (typeof window === "undefined") return false;
	try {
		const u = new URL(url, window.location.origin);
		return u.protocol === "http:" || u.protocol === "https:";
	} catch {
		return false;
	}
}

/**
 * Подписка на SSE от backend-адаптера. Без валидного URL не открывает соединение.
 * Браузер сам переподключается при обрыве (спецификация EventSource).
 */
export function useBackendSse(options: UseBackendSseOptions) {
	const connectionState = ref<BackendSseConnectionState>("idle");
	const lastMessageAt = ref<number | null>(null);
	const lastErrorText = shallowRef<string | null>(null);
	const lastJsonPayload = shallowRef<unknown>(undefined);

	const urlResolved = computed(() => String(toValue(options.url) ?? "").trim());
	const enabled = computed(() => toValue(options.enabled) !== false);

	let es: EventSource | null = null;
	const namedRemovers: Array<() => void> = [];

	function disconnect() {
		if (es) {
			for (const r of namedRemovers) r();
			namedRemovers.length = 0;
			es.close();
			es = null;
		}
		if (connectionState.value === "open") connectionState.value = "closed";
		else if (connectionState.value === "connecting")
			connectionState.value = "idle";
	}

	watch(
		[urlResolved, enabled],
		([url, en]) => {
			disconnect();
			lastErrorText.value = null;
			if (!en || !url || !isAllowedSseUrl(url)) {
				connectionState.value = "idle";
				return;
			}
			connectionState.value = "connecting";
			try {
				es = new EventSource(url, {
					withCredentials: !!options.withCredentials,
				});
			} catch (e) {
				connectionState.value = "error";
				lastErrorText.value =
					e instanceof Error ? e.message : String(e ?? "EventSource");
				return;
			}
			es.onopen = () => {
				connectionState.value = "open";
				options.onOpen?.();
			};
			es.onerror = (ev) => {
				connectionState.value = "error";
				lastErrorText.value = "Ошибка соединения SSE";
				options.onError?.(ev);
			};
			es.onmessage = (ev) => {
				lastMessageAt.value = Date.now();
				let data: unknown = ev.data;
				try {
					data = JSON.parse(ev.data) as unknown;
				} catch {
					/* не JSON — оставляем строку */
				}
				lastJsonPayload.value = data;
				options.onJsonMessage?.(data, ev);
			};
			const named = options.namedHandlers;
			if (named && es) {
				for (const [eventName, fn] of Object.entries(named)) {
					const wrapped = (e: MessageEvent) => {
						lastMessageAt.value = Date.now();
						fn(e);
					};
					es.addEventListener(eventName, wrapped);
					namedRemovers.push(() =>
						es?.removeEventListener(eventName, wrapped),
					);
				}
			}
		},
		{ immediate: true },
	);

	onUnmounted(disconnect);

	return {
		connectionState: readonly(connectionState),
		lastMessageAt: readonly(lastMessageAt),
		lastErrorText: readonly(lastErrorText),
		lastJsonPayload: readonly(lastJsonPayload),
		disconnect,
	};
}
