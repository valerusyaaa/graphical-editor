import "./charts/install-nuxt-globals";
import { createApp } from "vue";
import { createPinia } from "pinia";
import ElementPlus from "element-plus";
import "element-plus/dist/index.css";
import AppChartsShell from "./charts/AppChartsShell.vue";

const app = createApp(AppChartsShell);
app.use(createPinia());
app.use(ElementPlus);
app.mount("#app");
