import { AppSchema, NewScenario } from '/common/types'
import { EVENTS, events } from '../emitter'
import { createStore } from './create'
import { scenarioApi } from './data/scenario'
import { toastStore } from './toasts'

type ScenarioState = {
  scenarios: AppSchema.ScenarioBook[]
  loading: boolean
  partial: boolean
}

const initState: ScenarioState = {
  scenarios: [],
  loading: true,
  partial: false,
}

export const scenarioStore = createStore<ScenarioState>(
  'scenario',
  initState
)((get, set) => {
  events.on(EVENTS.loggedOut, () => {
    scenarioStore.setState(initState)
  })

  events.on(EVENTS.init, (init) => {
    scenarioStore.setState({ scenarios: init.scenarios || [], loading: false })
  })

  return {
    async *getAll({ loading, scenarios: prev, partial }) {
      if (loading) return

      yield { loading: true, scenarios: partial ? [] : prev }
      const res = await scenarioApi.getScenarios()
      if (res.result) {
        yield { loading: false, scenarios: res.result.scenarios || [] }
      }

      if (res.error) {
        yield { loading: false }
        toastStore.error(`Failed to retrieve scenario scenarios: ${res.error}`)
      }
    },

    async *getOne({ loading, scenarios: prev }, id: string) {
      if (loading) return

      yield { loading: true }
      const res = await scenarioApi.getScenario(id)
      if (res.result) {
        let next: AppSchema.ScenarioBook[]
        let partial = false
        const existingIndex = prev.findIndex((s) => s._id === id)
        if (existingIndex == -1) {
          next = [...prev, res.result]
          partial = true
        } else {
          next = prev.map((s) => (s._id === id ? res.result! : s))
        }
        yield { loading: false, scenarios: next, partial }
      }

      if (res.error) {
        yield { loading: false }
        toastStore.error(`Failed to retrieve scenario scenarios: ${res.error}`)
      }
    },

    async *create(
      { scenarios: prev, loading },
      scenario: NewScenario,
      onSuccess?: (scenario: AppSchema.ScenarioBook) => void,
      onFailure?: (scenario: NewScenario) => void
    ) {
      if (loading) return
      yield { loading: true }
      const res = await scenarioApi.createScenario(scenario)
      if (res.error) {
        toastStore.error(`Could not create scenario: ${res.error}`)
        yield { loading: false }
        onFailure?.(scenario)
        return
      }

      if (res.result) {
        yield { loading: false, scenarios: [...prev, res.result] }
        toastStore.success('Created scenario')
        onSuccess?.(res.result)
        return
      }
    },

    async *update(
      { scenarios: prev, loading },
      scenarioId: string,
      update: NewScenario,
      onSuccess?: () => void
    ) {
      if (loading) {
        toastStore.error('Cannot update scenario while loading')
        return
      }
      yield { loading: true }
      const res = await scenarioApi.updateScenario(scenarioId, update)
      if (res.error) {
        toastStore.error(`Failed to update scenario: ${res.error}`)
        yield { loading: false }
      }

      if (res.result) {
        const next = prev.map((scenario) =>
          scenario._id === scenarioId ? { ...scenario, ...update } : scenario
        )
        yield { loading: false, scenarios: next }
        toastStore.success(`Scenario updated`)
        onSuccess?.()
      }
    },

    async *remove({ loading, scenarios: prev }, scenarioId: string, onSuccess?: Function) {
      if (loading) {
        toastStore.error('Cannot remove scenario while loading')
        return
      }
      yield { loading: true }
      const res = await scenarioApi.removeScenario(scenarioId)

      if (res.error) {
        toastStore.error(`Failed to remove scenario: ${res.error}`)
        yield { loading: false }
      }

      if (res.result) {
        const next = prev.filter((scenario) => scenario._id !== scenarioId)
        yield { loading: false, scenarios: next }
        toastStore.success('Scenario deleted')
        onSuccess?.()
      }
    },
  }
})
