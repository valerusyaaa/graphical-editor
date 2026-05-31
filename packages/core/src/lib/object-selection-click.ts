/**
 * Выбор объекта по клику: Shift — добавить/убрать из группы,
 * без Shift — один объект или сохранить группу при клике по уже выделенному.
 */
export function resolveObjectClickSelection(
	currentIds: readonly number[],
	objectId: number,
	additive: boolean,
): number[] {
	if (additive) {
		if (currentIds.includes(objectId)) {
			return currentIds.filter((id) => id !== objectId);
		}
		return [...currentIds, objectId];
	}
	if (currentIds.includes(objectId) && currentIds.length > 1) {
		return [...currentIds];
	}
	return [objectId];
}
