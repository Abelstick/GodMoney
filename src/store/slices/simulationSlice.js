import { simulationService } from '@/services/simulationService'

// Escenarios guardados del simulador. El escenario en edición vive en la
// pantalla (borrador local); aquí solo la lista persistida.
export const createSimulationSlice = (set, get) => ({
  scenarios: [],
  scenariosLoading: false,
  scenariosLoaded: false,
  scenariosError: null,

  fetchScenarios: async () => {
    set({ scenariosLoading: true })
    try {
      const scenarios = await simulationService.getAll()
      set({ scenarios, scenariosLoading: false, scenariosLoaded: true, scenariosError: null })
    } catch (err) {
      // Sin la migración 019 la pantalla sigue sirviendo: se avisa en línea.
      set({ scenariosLoading: false, scenariosLoaded: true, scenariosError: err.message })
    }
  },

  saveScenario: async (scenario) => {
    const data = scenario.id
      ? await simulationService.update(scenario.id, scenario)
      : await simulationService.create(scenario)
    set((s) => ({
      scenarios: [data, ...s.scenarios.filter((x) => x.id !== data.id)],
      scenariosError: null,
    }))
    get().showToast(scenario.id ? 'Escenario actualizado' : 'Escenario guardado', 'success')
    return data
  },

  removeScenario: async (id) => {
    await simulationService.remove(id)
    set((s) => ({ scenarios: s.scenarios.filter((x) => x.id !== id) }))
    get().showToast('Escenario eliminado', 'info')
  },
})
