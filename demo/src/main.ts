import { createApp } from "vue";
import App from "./App.vue";
import { createPinia } from "pinia";
import "./styles/demo-theme.css";
import { initEditorUiTheme } from "../../packages/core/src/lib/editor-ui-theme";

initEditorUiTheme();

const app = createApp(App);
app.use(createPinia());
app.mount("#app");
