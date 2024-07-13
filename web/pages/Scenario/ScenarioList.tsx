import { Component, For, Match, Show, Switch, createSignal, onMount } from 'solid-js'
import { scenarioStore } from '../../store'
import { A, useNavigate } from '@solidjs/router'
import PageHeader from '../../shared/PageHeader'
import Loading from '/web/shared/Loading'
import Button from '/web/shared/Button'
import { Plus, Upload } from 'lucide-solid'
import ImportScenarioModal from './components/ImportScenarioModal'
import { Page } from '/web/Layout'

const ScenarioList: Component = () => {
  const scenarioState = scenarioStore()
  const nav = useNavigate()

  const [showImport, setShowImport] = createSignal(false)

  onMount(() => {
    scenarioStore.getAll()
  })

  const create = () => {
    scenarioStore.create(
      {
        name: '',
        description: '',
        overwriteCharacterScenario: false,
        text: '',
        instructions: '',
        states: [],
        entries: [],
      },
      (r) => nav(`/scenario/${r._id}`)
    )
  }

  return (
    <Page>
      <PageHeader
        title={
          <div class="flex w-full justify-between">
            <div>Scenarios</div>
            <div class="flex text-base">
              <div class="px-1">
                <Button schema="secondary" onClick={() => setShowImport(true)}>
                  <Upload />
                  <span class="hidden sm:inline">Import Scenario</span>
                </Button>
              </div>
              <div class="px-1">
                <Button schema="primary" onClick={() => create()}>
                  <Plus />
                  <span class="hidden sm:inline">Create Scenario</span>
                </Button>
              </div>
            </div>
          </div>
        }
      />

      <Switch>
        <Match when={scenarioState.loading}>
          <div class="flex justify-center">
            <Loading />
          </div>
        </Match>
        <Match when={scenarioState.scenarios.length === 0}>
          <div class="mt-16 flex w-full justify-center rounded-full text-xl">
            You have no scenarios yet.
          </div>
        </Match>
        <Match when={scenarioState.scenarios.length > 0}>
          <div class="flex flex-col gap-2">
            <For each={scenarioState.scenarios}>
              {(scenario) => (
                <div class="flex w-full justify-between gap-2 rounded-lg bg-[var(--bg-800)] p-1 hover:bg-[var(--bg-700)]">
                  <A class="flex w-full cursor-pointer gap-2" href={`/scenario/${scenario._id}`}>
                    <div class="flex flex-col justify-center gap-0 p-2">
                      <div class="overflow-hidden text-ellipsis whitespace-nowrap font-bold leading-5">
                        {scenario.name || 'Unnamed Scenario'}
                      </div>
                      <Show when={scenario.description}>
                        <div class="overflow-hidden text-ellipsis whitespace-nowrap text-sm leading-4">
                          {scenario.description}
                        </div>
                      </Show>
                    </div>
                  </A>
                </div>
              )}
            </For>
          </div>
        </Match>
      </Switch>

      <ImportScenarioModal show={showImport()} close={() => setShowImport(false)} />
    </Page>
  )
}

export default ScenarioList
