import { v4 } from 'uuid'
import { AppSchema, NewScenario } from '/common/types'
import { api, isLoggedIn } from '../api'
import { localApi } from './storage'

export const scenarioApi = {
  getScenarios,
  getScenario,
  createScenario,
  updateScenario,
  removeScenario,
}

export async function getScenarios() {
  if (isLoggedIn()) {
    const res = await api.get<{ scenarios: AppSchema.ScenarioBook[] }>('/scenario')
    return res
  }

  const scenarios = await localApi.loadItem('scenario')
  return localApi.result({ scenarios })
}

export async function getScenario(id: string) {
  if (isLoggedIn()) {
    const res = await api.get<AppSchema.ScenarioBook>(`/scenario/${id}`)
    return res
  }

  const scenarios = await localApi.loadItem('scenario')
  return localApi.result(scenarios.find((s) => s._id === id))
}

export async function createScenario(scenario: NewScenario) {
  if (isLoggedIn()) {
    const res = await api.post<AppSchema.ScenarioBook>(`/scenario`, scenario)
    return res
  }

  const next: AppSchema.ScenarioBook = {
    _id: v4(),
    kind: 'scenario',
    userId: localApi.ID,
    ...scenario,
  }
  const scenarios = await localApi.loadItem('scenario').then((res) => res.concat(next))
  await localApi.saveScenarios(scenarios)

  return localApi.result(next)
}

export async function updateScenario(scenarioId: string, update: NewScenario) {
  if (isLoggedIn()) {
    const res = await api.method('put', `/scenario/${scenarioId}`, update)
    return res
  }

  const items = await localApi.loadItem('scenario')

  const scenarios = items.map((scenario) =>
    scenario._id === scenarioId ? { ...scenario, ...update } : scenario
  )
  await localApi.saveScenarios(scenarios)

  return localApi.result({ success: true })
}

export async function removeScenario(scenarioId: string) {
  if (isLoggedIn()) {
    const res = await api.method('delete', `/scenario/${scenarioId}`)
    return res
  }

  const scenarios = await localApi
    .loadItem('scenario')
    .then((res) => res.filter((scenario) => scenario._id !== scenarioId))
  await localApi.saveScenarios(scenarios)

  return localApi.result({ success: true })
}
