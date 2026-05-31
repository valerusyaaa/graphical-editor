import type { InjectionKey, Ref } from "vue";
import type { GraphicObjectDto, ObjectBaseData } from "../api/types";

/** v-model `objects` редактора — для ПКМ-меню и подписи состояния крана. */
export const SCHEMA_EDITOR_OBJECTS_KEY: InjectionKey<
	Ref<GraphicObjectDto<ObjectBaseData>[]>
> = Symbol("schemaEditorObjects");
