import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { devSseMockPlugin } from "./vite-plugin-dev-sse-mock";

const demoDir = fileURLToPath(new URL(".", import.meta.url));
const graphicsExampleRoot = path.resolve(
	demoDir,
	"../graphics/graphics/example",
);

export default defineConfig(({ command, mode }) => {
	const env = loadEnv(mode, demoDir, "");
	const demoPort = Number(env.VITE_DEMO_PORT) || 5173;
	const metamodelProxyTarget = (
		env.VITE_METAMODEL_PROXY_TARGET ?? "http://100.77.240.66:5233"
	).trim();
	const domainServiceProxyTarget = (
		env.VITE_DOMAIN_SERVICE_PROXY_TARGET ?? "http://127.0.0.1:5085"
	).trim();
	const calculationProxyTarget = (
		env.VITE_CALCULATION_SERVICE_PROXY_TARGET ??
		env.VITE_DOMAIN_SERVICE_PROXY_TARGET ??
		"http://127.0.0.1:5041"
	).trim();

	return {
		plugins: [
			vue(),
			...(command === "serve" ? [devSseMockPlugin()] : []),
		],
		resolve: {
			alias: {
				"@": fileURLToPath(new URL("./src", import.meta.url)),
				"~": graphicsExampleRoot,
				"charts-for-diplom": path.resolve(demoDir, "../graphics/graphics/src"),
			},
		},
		build: {
			rollupOptions: {
				input: {
					main: path.resolve(demoDir, "index.html"),
					charts: path.resolve(demoDir, "charts.html"),
				},
			},
		},
		server: {
			port: demoPort,
			proxy: {
				"/api": {
					target: "http://127.0.0.1:5000",
					changeOrigin: true,
					/** Как в `graphics/graphics/example/nuxt.config.ts`: бэкенд слушает `/objects`, а не `/api/objects` */
					rewrite: (p) => p.replace(/^\/api/, ""),
				},
				...(metamodelProxyTarget
					? {
							"/mm-proxy": {
								target: metamodelProxyTarget,
								changeOrigin: true,
								rewrite: (p: string) => {
									const next = p.replace(/^\/mm-proxy/, "");
									return next.length ? next : "/";
								},
							},
						}
					: {}),
				"/domain-proxy": {
					target: domainServiceProxyTarget,
					changeOrigin: true,
					rewrite: (p: string) => {
						const next = p.replace(/^\/domain-proxy/, "");
						return next.length ? next : "/";
					},
				},
				"/calc-proxy": {
					target: calculationProxyTarget,
					changeOrigin: true,
					rewrite: (p: string) => {
						const next = p.replace(/^\/calc-proxy/, "");
						return next.length ? next : "/";
					},
				},
			},
		},
	};
});
