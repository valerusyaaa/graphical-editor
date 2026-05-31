/// <reference types="vite/client" />

interface ImportMetaEnv {
	/** URL SSE (полный или путь `/...`). Пусто — без подключения к сети */
	readonly VITE_SSE_URL?: string;
	/** Порт dev-сервера демо (по умолчанию 5173), чтобы не конфликтовать с другим фронтом на том же ПК */
	readonly VITE_DEMO_PORT?: string;
	/**
	 * Базовый URL бэкенда метамодели Полины для dev-прокси.
	 * Пример: `http://127.0.0.1:8080` — тогда запросы на `/mm-proxy/...` уходят на её API без CORS с вашего origin.
	 */
	readonly VITE_METAMODEL_PROXY_TARGET?: string;
	/**
	 * GET JSON со списком типов объектов (массив или обёртка `objectTypes` / `types` / `data`).
	 * Удобно задать путь через прокси: `/mm-proxy/api/v1/object-types` (точный путь — по договорённости с Полиной).
	 */
	readonly VITE_METAMODEL_TYPES_URL?: string;
	/**
	 * Базовый URL сервиса предметной области для dev-прокси `/domain-proxy`.
	 * Пример: `http://192.168.0.114:5085` или `http://127.0.0.1:5085`.
	 */
	readonly VITE_DOMAIN_SERVICE_PROXY_TARGET?: string;
	/** Прокси CalculationService (порт 5041). */
	readonly VITE_CALCULATION_SERVICE_PROXY_TARGET?: string;
	/** POST сохранения EditedJSON. По умолчанию `/domain-proxy/api/schemes/raw`. */
	readonly VITE_DOMAIN_SCHEME_RAW_URL?: string;
	/** PUT обновления схемы. По умолчанию `/domain-proxy/api/schemes/{schemeId}`. */
	readonly VITE_DOMAIN_SCHEME_RAW_UPDATE_URL?: string;
	/** POST расчёта на 5041. По умолчанию `/calc-proxy/api/calculations/static?schemeId={schemeId}`. */
	readonly VITE_CALCULATION_URL?: string;
	/** @deprecated Используйте `VITE_CALCULATION_URL`. */
	readonly VITE_CALCULATION_STATIC_URL?: string;
	/**
	 * Базовый URL коллекции схем (GET список, GET по id, POST).
	 * По умолчанию `/domain-proxy/api/schemes`.
	 */
	readonly VITE_DOMAIN_SCHEME_API_URL?: string;
	/**
	 * POST создания схемы. Если не задан — совпадает с `VITE_DOMAIN_SCHEME_API_URL`.
	 */
	readonly VITE_DOMAIN_SCHEME_CREATE_URL?: string;
	/** GET списка схем. По умолчанию — коллекция (`VITE_DOMAIN_SCHEME_API_URL`). */
	readonly VITE_DOMAIN_SCHEME_LIST_URL?: string;
	/** GET одной схемы по id. Шаблон: `.../api/schemes/{schemeId}` (`{id}` — алиас). */
	readonly VITE_DOMAIN_SCHEME_GET_BY_ID_URL?: string;
	/** GET по имени. Шаблон: `.../api/schemes/by-name/{name}`. */
	readonly VITE_DOMAIN_SCHEME_GET_BY_NAME_URL?: string;
	/** Поле EditedJSON в POST/GET. По умолчанию `Data` (`SchemeRequestDto.Data`). */
	readonly VITE_DOMAIN_SCHEME_SCHEMA_KEY?: string;
	/** Описание схемы в POST. По умолчанию «Сохранена из графического редактора». */
	readonly VITE_DOMAIN_SCHEME_DESCRIPTION?: string;
	/** Если `true`, поле Data — строка JSON, а не объект. */
	readonly VITE_DOMAIN_SCHEME_SCHEMA_AS_STRING?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
