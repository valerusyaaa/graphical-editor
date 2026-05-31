import type { IncomingMessage, ServerResponse } from "node:http";
import type { Connect, Plugin, ViteDevServer } from "vite";

/** Локальный SSE без RabbitMQ: `VITE_SSE_URL=/api/dev/sse-mock` */
export function devSseMockPlugin(): Plugin {
	return {
		name: "graphical-editor-dev-sse-mock",
		configureServer(server: ViteDevServer) {
			server.middlewares.use(
				(
					req: IncomingMessage,
					res: ServerResponse,
					next: Connect.NextFunction,
				) => {
					const pathOnly = req.url?.split("?")[0];
					if (pathOnly !== "/api/dev/sse-mock" || req.method !== "GET") {
						next();
						return;
					}
					res.statusCode = 200;
					res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
					res.setHeader("Cache-Control", "no-cache, no-transform");
					res.setHeader("Connection", "keep-alive");
					(
						res as ServerResponse & { flushHeaders?: () => void }
					).flushHeaders?.();

					const write = (chunk: string) => {
						if (!res.writableEnded) res.write(chunk);
					};
					const sendJson = (obj: unknown) => {
						write(`data: ${JSON.stringify(obj)}\n\n`);
					};

					sendJson({
						type: "mock.connected",
						hint: "Локальный мок Vite; для боя замените VITE_SSE_URL на URL адаптера",
					});

					const interval = setInterval(() => {
						sendJson({ type: "mock.tick", ts: Date.now() });
					}, 25000);

					req.on("close", () => {
						clearInterval(interval);
						if (!res.writableEnded) res.end();
					});
				},
			);
		},
	};
}
