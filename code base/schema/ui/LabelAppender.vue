<script setup lang="ts">
import { GraphicLabelItemSourceTypeDto } from "@/entities/projects";
import { AppenderLabelItems, DialogPassportItem, DialogCalcultaionItem } from "@/features/append-label";
import { useI18n } from "vue-i18n";

const props = defineProps<{
    appenderLableItem: AppenderLabelItems;
}>();
const { t } = useI18n();
</script>
<template>
    <div>
        <PrimeDialog
            v-model:visible="appenderLableItem.isVisibleAddPassportLabel"
            :header="t('pages.windows.schema.addPassportLabels')"
            :style="{ width: '25rem' }"
            modal
        >
            <DialogPassportItem
                :appender="appenderLableItem"
                @close-dialog="appenderLableItem.togglePassportDialog(false)"
            />
        </PrimeDialog>
        <PrimeDialog
            v-model:visible="appenderLableItem.isVisibleAddCalculationLabel"
            :header="t('pages.windows.schema.addCalculationLabels')"
            :style="{ width: '25rem' }"
            modal
        >
            <DialogCalcultaionItem
                :appender="appenderLableItem"
                :source-type="GraphicLabelItemSourceTypeDto.CalculatedValue"
                @close-dialog="appenderLableItem.toggleCalcDialog(false)"
            />
        </PrimeDialog>
        <PrimeDialog
            v-model:visible="appenderLableItem.isVisibleAddRawDataLabel"
            :header="t('pages.windows.schema.addRawDataLabels')"
            :style="{ width: '25rem' }"
            modal
        >
            <DialogCalcultaionItem
                :appender="appenderLableItem"
                :source-type="GraphicLabelItemSourceTypeDto.RawValue"
                @close-dialog="appenderLableItem.toggleRawDataDialog(false)"
            />
        </PrimeDialog>
        <PrimeDialog
            v-model:visible="appenderLableItem.isVisibleAddProcessedDataLabel"
            :header="t('pages.windows.schema.addProcessedDataLabels')"
            :style="{ width: '25rem' }"
            modal
        >
            <DialogCalcultaionItem
                :appender="appenderLableItem"
                :source-type="GraphicLabelItemSourceTypeDto.ProcessedValue"
                @close-dialog="appenderLableItem.toggleProcessedDataDialog(false)"
            />
        </PrimeDialog>
    </div>
</template>
