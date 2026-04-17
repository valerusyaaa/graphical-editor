<script setup lang="ts">
import { ref } from "vue";
import {
	GraphicObjectDto,
	ObjectDescription,
} from "../../packages/core/src/api/types";
import { GraphicalEditor } from "../../packages/core/src/ui";

const clicked = ref(false);

const winRef = ref();
const onCoreClick = () => {
	clicked.value = true;
};

type ObjectData = {
	techObjectId: number;
};

const objects = ref<GraphicObjectDto<ObjectData>[]>([
	{
		id: 1,
		featureObjectType: "square",
		graphObjectType: "pointer",
		position: {
			x: 100,
			y: 100,
		},
		data: {
			techObjectId: 1,
		},
	},
	{
		id: 2,
		featureObjectType: "square",
		graphObjectType: "pointer",
		position: {
			x: 200,
			y: 200,
		},
		data: {
			techObjectId: 2,
		},
	},
]);
const descriptions = ref<ObjectDescription[]>([
	{
		featureObjectType: "square",
		graphObjectType: "pointer",
		thikness: 10,
		strokeWidth: 1,
		offsets: {
			top: 0,
			left: 0,
		},
		polynom: [
			{
				x: 0,
				y: 0,
			},
			{
				x: 100,
				y: 0,
			},
			{
				x: 100,
				y: 100,
			},
			{
				x: 0,
				y: 100,
			},
		],
		fillColor: "red",
		strokeColor: "blue",
	},
]);
</script>

<template>
	<main class="page">
		<section ref="winRef" class="panel">
			<h1>Graphical Editor Demo</h1>
			<p>
				Это тестовое приложение, использующее компонент
				из
				<code>@graphical-editor/core</code>.
			</p>

			<GraphicalEditor
				win-ref="winRef"
				:objects="objects"
				:descriptions="descriptions"
			/>

			<p v-if="clicked" class="status">
				Событие <code>click</code> получено из
				core-компонента.
			</p>
		</section>
	</main>
</template>

<style scoped>
.page {
	min-height: 100vh;
	margin: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	background: radial-gradient(
		circle at top,
		#e0f2fe,
		#eff6ff 45%,
		#f9fafb
	);
	font-family:
		system-ui,
		-apple-system,
		BlinkMacSystemFont,
		"Segoe UI",
		sans-serif;
}

.panel {
	max-width: 840px;
	width: 100%;
	padding: 2rem;
	border-radius: 1rem;
	background: white;
	box-shadow: 0 18px 45px rgba(15, 23, 42, 0.18);
}

h1 {
	margin: 0 0 1rem;
	font-size: 1.75rem;
}

p {
	margin: 0 0 1rem;
	color: #4b5563;
}

code {
	font-family:
		ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
		"Liberation Mono", "Courier New", monospace;
	background: #f3f4f6;
	padding: 0.1rem 0.3rem;
	border-radius: 0.25rem;
}

.status {
	margin-top: 1rem;
	font-weight: 500;
	color: #166534;
	background: #dcfce7;
	padding: 0.5rem 0.75rem;
	border-radius: 0.5rem;
}
</style>
