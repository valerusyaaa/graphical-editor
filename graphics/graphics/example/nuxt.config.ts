// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@pinia/nuxt'],
  css: ['element-plus/dist/index.css'],
  ssr: false, // Отключаем SSR для избежания проблем с гидратацией
  vite: {
    server: {
      proxy: {
        "/api": {
          target: "http://localhost:5000",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ""),
        },
      },
    },
  },
  runtimeConfig: {
    public: {
      apiBase: "/api",
      /** ws(s)://host:15674/ws — RabbitMQ web-stomp; переопределяется NUXT_PUBLIC_* из .env */
      brokerApiUrl: process.env.NUXT_PUBLIC_BROKER_API_URL ?? "",
      brokerLogin: process.env.NUXT_PUBLIC_BROKER_LOGIN ?? "",
      brokerPassword: process.env.NUXT_PUBLIC_BROKER_PASSWORD ?? "",
    },
  },
  build: {
    transpile: ["charts-for-diplom"],
  },
})