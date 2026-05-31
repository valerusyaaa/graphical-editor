declare module "nuxt/schema" {
  interface PublicRuntimeConfig {
    brokerApiUrl: string;
    brokerLogin: string;
    brokerPassword: string;
  }
}

export {};
