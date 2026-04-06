<script setup lang="ts">
import { ItemPQTHint } from ".";
import { convertTechObjectTypeFromDto } from "@/widgets/tech-passport-editor/lib";
import { useHintPQT, useHintValveOpening } from "../../lib";
import {
    LinearGraphicObject,
    PointerGraphicObject,
    SelectedLinearGraphicObject,
    SelectedPointerGraphicObject,
} from "@/shared/graphical-editor";

const props = defineProps<{
    data: PointerGraphicObject | LinearGraphicObject | SelectedPointerGraphicObject | SelectedLinearGraphicObject;
}>();

const propsObjectdata = computed(() => {
    if (props.data instanceof SelectedPointerGraphicObject || props.data instanceof SelectedLinearGraphicObject) {
        //TODO чё то придмуать вместо восклицательного
        return props.data.objectScheme!;
    } else {
        return props.data;
    }
});
const objectId = toRef(() => props.data.techObjectId);
const techType = computed(() => propsObjectdata.value.techType ? convertTechObjectTypeFromDto(propsObjectdata.value.techType) : undefined);

const { dataPQT, isShowPQT, pUnitOpt, qUnitOpt, tUnitOpt, isLoading } = useHintPQT(objectId.value, techType.value);
const { openingValue, colorText, isShowValveOpening } = useHintValveOpening(
    objectId.value!,
    propsObjectdata.value.techType!
);
</script>
<template>
    <div class="flex flex-col w-fit p-3">
        <div class="flex justify-between gap-5 w-full">
            <span>{{ propsObjectdata.label }}</span>
            <span v-if="isShowValveOpening" :style="{ color: colorText }">{{ openingValue }} %</span>
        </div>
        <PrimeDivider v-if="isShowPQT" layout="horizontal" />
        <div v-if="isShowPQT" class="grid grid-cols-2 gap-2 w-full">
            <div class="flex flex-col items-center gap-2">
                <ItemPQTHint
                    label="P in"
                    :value="dataPQT.pIn"
                    :unit-name="pUnitOpt?.unit.displayName"
                    :loading="isLoading"
                />
                <ItemPQTHint
                    label="Q in"
                    :value="dataPQT.qIn"
                    :unit-name="qUnitOpt?.unit.displayName"
                    :loading="isLoading"
                />
                <ItemPQTHint
                    label="T in"
                    :value="dataPQT.tIn"
                    :unit-name="tUnitOpt?.unit.displayName"
                    :loading="isLoading"
                />
            </div>
            <div class="flex flex-col items-center gap-2">
                <ItemPQTHint
                    label="P out"
                    :value="dataPQT.pOut"
                    :unit-name="pUnitOpt?.unit.displayName"
                    :loading="isLoading"
                />
                <ItemPQTHint
                    label="Q out"
                    :value="dataPQT.qOut"
                    :unit-name="qUnitOpt?.unit.displayName"
                    :loading="isLoading"
                />
                <ItemPQTHint
                    label="T out"
                    :value="dataPQT.tOut"
                    :unit-name="tUnitOpt?.unit.displayName"
                    :loading="isLoading"
                />
            </div>
        </div>
    </div>
</template>
