<script setup lang="ts">
import { computed } from "vue";
import { baseDescriptors } from "../data/descriptors";
import { getDescriptionByType } from "../../../packages/core/src/model/schema/graphic-object-dto-factory";
import {
	CONSUMER_POINTER_SIDE,
	getConsumerInnerPolynom,
	getConsumerOuterPolynom,
	PRODUCER_POINTER_SIZE,
} from "../../../packages/core/src/model/schema/pointer/pointer-graphic-object";
import {
	canonicalFeatureType,
	isConsumerFeature,
	isPipeFeature,
	isProducerFeature,
	isMonitorFeature,
	isValveFeature,
} from "../../../packages/core/src/model/schema/feature-type-aliases";

const props = defineProps<{
	code: string;
}>();

const feature = computed(() => canonicalFeatureType(props.code));

const desc = computed(() => {
	try {
		return getDescriptionByType(baseDescriptors, feature.value);
	} catch {
		return null;
	}
});

const producerSize = PRODUCER_POINTER_SIZE;
const consumerSide = CONSUMER_POINTER_SIDE;

const consumerOuter = computed(() =>
	getConsumerOuterPolynom(consumerSide)
		.map((p) => `${p.x},${p.y}`)
		.join(" "),
);

const consumerInner = computed(() =>
	getConsumerInnerPolynom(consumerSide)
		.map((p) => `${p.x},${p.y}`)
		.join(" "),
);

const valvePoints = computed(() => {
	const poly = desc.value?.polynom;
	if (!poly?.length) return "";
	return poly.map((p) => `${p.x},${p.y}`).join(" ");
});

const fill = computed(() => desc.value?.fillColor ?? "#a3a3a3");
const stroke = computed(() => desc.value?.strokeColor ?? "#000000");
const strokeW = computed(() => Math.max(2, (desc.value?.strokeWidth ?? 1) + 1));
</script>

<template>
	<!-- Поставщик: как drawProducerIcon на схеме -->
	<svg
		v-if="isProducerFeature(feature)"
		:viewBox="`0 0 ${producerSize} ${producerSize}`"
		width="48"
		height="48"
		aria-hidden="true"
	>
		<polygon
			:points="`0,0 ${producerSize},0 ${producerSize},${producerSize} 0,${producerSize}`"
			:fill="fill"
			:stroke="stroke"
			:stroke-width="strokeW"
		/>
		<polygon points="10,20 28,20 28,28 10,28" fill="#000000" />
		<polygon points="28,16 40,24 28,32" fill="#000000" />
	</svg>

	<!-- Потребитель: как drawConsumerIcon на схеме -->
	<svg
		v-else-if="isConsumerFeature(feature)"
		:viewBox="`0 0 ${Math.round((consumerSide * Math.sqrt(3)) / 2)} ${consumerSide}`"
		width="48"
		height="44"
		aria-hidden="true"
	>
		<polygon
			:points="consumerOuter"
			:fill="fill"
			:stroke="stroke"
			:stroke-width="strokeW"
		/>
		<polygon :points="consumerInner" fill="#000000" />
	</svg>

	<!-- Труба: линия в цветах дескриптора -->
	<svg
		v-else-if="isPipeFeature(feature)"
		viewBox="0 0 48 16"
		width="48"
		height="16"
		aria-hidden="true"
	>
		<line
			x1="2"
			y1="8"
			x2="46"
			y2="8"
			:stroke="stroke"
			:stroke-width="desc?.thikness ?? 10"
			stroke-linecap="round"
		/>
	</svg>

	<!-- Монитор: пунктирная рамка -->
	<svg
		v-else-if="isMonitorFeature(feature)"
		viewBox="0 0 48 40"
		width="48"
		height="40"
		aria-hidden="true"
	>
		<rect
			x="4"
			y="4"
			width="40"
			height="32"
			fill="none"
			stroke="#525252"
			stroke-width="1.5"
			stroke-dasharray="4 3"
			rx="2"
		/>
		<text x="8" y="18" font-size="8" fill="#525252">P</text>
		<text x="8" y="28" font-size="8" fill="#15803d">Q</text>
	</svg>

	<!-- Кран (Valve): полигон из polynom дескриптора -->
	<svg
		v-else-if="isValveFeature(feature) && valvePoints"
		viewBox="0 0 100 100"
		width="48"
		height="48"
		aria-hidden="true"
	>
		<polygon
			:points="valvePoints"
			:fill="fill"
			:stroke="stroke"
			:stroke-width="strokeW"
		/>
	</svg>
</template>
