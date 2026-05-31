/**

 * Схема — SchemeService (5085). Стационарный расчёт — CalculationService (5041).

 * POST `/api/calculations/static?schemeId={uuid}`

 */



import {
	extractSchemeId,
	formatApiErrors,
	postSchemeToDomainService,
	putSchemeToDomainService,
} from "./domain-scheme-api";

import {
	logServerError,
	logServerRequest,
	logServerResponse,
} from "./message-log";



export type SavedSchemeState = {

	schemeId: string | number;

	fingerprint: string;

	name: string;

};



export type StaticCalculationRunResult = {

	schemeId: string | number;

	calculationResult: unknown;

	savedState: SavedSchemeState;

};



function staticCalculationUrl(schemeId: string | number): string {

	const template =

		import.meta.env.VITE_CALCULATION_URL?.trim() ||

		import.meta.env.VITE_CALCULATION_STATIC_URL?.trim() ||

		"/calc-proxy/api/calculations/static?schemeId={schemeId}";

	return template

		.replace(/\{schemeId\}/gi, encodeURIComponent(String(schemeId)))

		.replace(/\{id\}/gi, encodeURIComponent(String(schemeId)));

}



async function calculationRequest(

	url: string,

	init: RequestInit,

): Promise<unknown> {

	const method = init.method ?? "POST";

	logServerRequest(method, url);

	let res: Response;

	try {

		res = await fetch(url, init);

	} catch {

		const err = new Error(

			`Нет связи с сервисом расчётов (${url}). Проверьте VITE_CALCULATION_SERVICE_PROXY_TARGET (порт 5041) и перезапустите pnpm dev.`,

		);

		logServerError(method, url, err.message);

		throw err;

	}



	const text = await res.text();

	let body: unknown = null;

	if (text) {

		try {

			body = JSON.parse(text) as unknown;

		} catch {

			body = text;

		}

	}



	logServerResponse(method, url, res.status);

	if (!res.ok) {
		const detail =
			formatApiErrors(body) || res.statusText || "ошибка сервера";
		throw new Error(
			`Расчёт завершился с ошибкой HTTP ${res.status}: ${detail}`,
		);
	}



	if (import.meta.env.DEV) {

		console.debug(

			"[static-calculation]",

			init.method ?? "POST",

			url,

			res.status,

			body,

		);

	}



	return body;

}



export function fingerprintSchemeJson(schemeJson: unknown): string {

	return JSON.stringify(schemeJson);

}



/**

 * 1–4. POST/PUT схемы на 5085 (`SchemeRequestDto`).

 * 5. POST расчёта на 5041 (`/api/calculations/static?schemeId=…`).

 */

export async function runStaticCalculationFlow(options: {

	schemeJson: unknown;

	schemeName: string;

	saved: SavedSchemeState | null;

}): Promise<StaticCalculationRunResult> {

	const fingerprint = fingerprintSchemeJson(options.schemeJson);

	const name =

		options.schemeName.trim() || options.saved?.name || "Схема редактора";

	let schemeId: string | number;



	if (!options.saved?.schemeId) {

		const result = await postSchemeToDomainService(

			options.schemeJson,

			name,

		);

		const id = result.id ?? extractSchemeId(result.body);

		if (id == null) {

			throw new Error(

				"Схема сохранена, но сервер не вернул id. Проверьте ответ POST /api/schemes.",

			);

		}

		schemeId = id;

	} else if (options.saved.fingerprint !== fingerprint) {

		schemeId = options.saved.schemeId;

		await putSchemeToDomainService(

			schemeId,

			options.schemeJson,

			name,

		);

	} else {

		schemeId = options.saved.schemeId;

	}



	const calculationResult = await calculationRequest(

		staticCalculationUrl(schemeId),

		{ method: "POST", headers: { Accept: "application/json" } },

	);



	return {

		schemeId,

		calculationResult,

		savedState: {

			schemeId,

			fingerprint,

			name,

		},

	};

}


