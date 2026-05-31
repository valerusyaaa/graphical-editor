import type { $Fetch } from "ofetch";

export {};

declare global {
	function useRuntimeConfig(): {
		public: {
			apiBase: string;
			brokerApiUrl: string;
			brokerLogin: string;
			brokerPassword: string;
		};
	};

	var $fetch: $Fetch;
}
