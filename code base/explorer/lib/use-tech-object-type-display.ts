import { useI18n } from 'vue-i18n';
import { 
    getTechObjectTypeTranslationKey, 
    convertTechObjectTypeNameToIcon,
    type TechObjectTypeDto 
} from "@/entities/projects";

export function useTechObjectTypeDisplay() {
    const { t } = useI18n();
    
    const getDisplayName = (type: TechObjectTypeDto): string => {
        const translationKey = getTechObjectTypeTranslationKey(type);
        return t(translationKey);
    };
    
    const getIcon = (type: TechObjectTypeDto): string => {
        return convertTechObjectTypeNameToIcon(type);
    };
    
    return { getDisplayName, getIcon };
}

