import { useSimulationStore } from "@/entities/calculation-results";

export const useProjectsStore = defineStore("projects", {
    state: () => ({
        _projectId: undefined as number | undefined,
        _regimeId: undefined as number | undefined,
        _scenarioId: undefined as number | undefined,
        _isActiveProject: false,
    }),
    getters: {
        projectId: state => state._projectId,
        regimeId: state => state._regimeId,
        scenarioId: state => state._scenarioId,
        isProjectLoaded: state => state._projectId !== undefined,
        isActiveProject: state => state._isActiveProject,
    },
    actions: {
        async setProject(id: number | undefined) {
            this._projectId = id;
            this._regimeId = undefined;
            this._scenarioId = undefined;

            const simulationStore = useSimulationStore();
            await simulationStore.deleteSession();
        },

        setRegime(id: number | undefined) {
            this._regimeId = id;
        },
        setScenario(id: number | undefined) {
            this._scenarioId = id;
        },
    },
});
