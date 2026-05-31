import { ofetch } from "ofetch";

/** Конфиг как у Nuxt `runtimeConfig.public` в `graphics/graphics/example/nuxt.config.ts` */
export const chartsRuntimeConfig = {
	public: {
		apiBase: import.meta.env.VITE_CHARTS_API_BASE ?? "/api",
		brokerApiUrl: import.meta.env.VITE_BROKER_API_URL ?? "",
		brokerLogin: import.meta.env.VITE_BROKER_LOGIN ?? "",
		brokerPassword: import.meta.env.VITE_BROKER_PASSWORD ?? "",
	},
} as const;

export function useRuntimeConfig(): typeof chartsRuntimeConfig {
	return chartsRuntimeConfig;
}

Object.assign(globalThis, {
	useRuntimeConfig,
	$fetch: ofetch,
});
