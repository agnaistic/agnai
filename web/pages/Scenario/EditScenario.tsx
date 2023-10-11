import { Component, Show, createSignal, onMount } from 'solid-js'
import { scenarioStore } from '../../store'
import PageHeader from '../../shared/PageHeader'
import Button from '../../shared/Button'
import { Copy, Download, Trash } from 'lucide-solid'
import { useNavigate, useParams } from '@solidjs/router'
import TextInput from '../../shared/TextInput'
import { deepCloneAndRemoveFields } from '../../shared/util'
import Divider from '/web/shared/Divider'
import { Toggle } from '/web/shared/Toggle'
import { ConfirmModal } from '/web/shared/Modal'
import { ExportScenarioModal } from './components/DownloadScenarioModal'
import EditScenarioEvents from './EditScenarioEvents'

const CreateScenario: Component = () => {
  let ref: any
  const params = useParams<{ editId: string }>()
  const nav = useNavigate()
  const state = scenarioStore((x) => ({
    loading: x.loading,
    scenario: x.scenarios.find((s) => s._id === params.editId),
  }))

  const [showDelete, setShowDelete] = createSignal(false)
  const [showDownload, setShowDownload] = createSignal(false)

  onMount(() => {
    scenarioStore.getOne(params.editId)
  })

  const confirmDelete = () => {
    scenarioStore.remove(params.editId, () => nav('/scenario'))
  }

  const duplicateScenario = () => {
    if (!state.scenario) return
    const clone = deepCloneAndRemoveFields(state.scenario, ['_id', 'userId', 'kind'])
    scenarioStore.create(clone, (r) => nav(`/scenario/${r._id}/edit`))
  }

  return (
    <>
      <PageHeader
        title={
          <div class="flex w-full justify-between">
            <div>Edit Scenario</div>
            <div class="flex text-base">
              <div class="px-1">
                <Button schema="secondary" onClick={() => duplicateScenario()}>
                  <Copy />
                  <span class="hidden sm:inline">Duplicate</span>
                </Button>
              </div>
              <div class="px-1">
                <Button schema="secondary" onClick={() => setShowDownload(true)}>
                  <Download />
                  <span class="hidden sm:inline">Download</span>
                </Button>
              </div>
              <div class="px-1">
                <Button schema="red" onClick={() => setShowDelete(true)}>
                  <Trash />
                  <span class="hidden sm:inline">Delete</span>
                </Button>
              </div>
            </div>
          </div>
        }
      />

      <div class="flex items-center gap-2">
        <Show
          when={state.scenario?.entries.length ?? 0 > 0}
          fallback={<p>No events attached to this scenario</p>}
        >
          <p>{state.scenario!.entries.length} event(s)</p>
        </Show>
      </div>

      <Divider />

      <div class="text-lg font-bold">Scenario Details</div>

      <form class="flex flex-col gap-4" ref={ref}>
        <TextInput
          fieldName="name"
          required
          label="Name"
          helperText="The name of your scenario."
          placeholder="My scenario"
          value={state.scenario?.name}
        />

        <TextInput
          fieldName="description"
          label="Description"
          helperText="More information about your scenario."
          placeholder="This scenario is about..."
          value={state.scenario?.description}
        />

        <TextInput
          fieldName="text"
          isMultiline
          label="Prompt Text"
          helperText="Optional. Additional text to add to the scenario prompt."
          placeholder="{{char}} and {{user}} are in a scenario. They are..."
          value={state.scenario?.text}
        />

        <Toggle
          fieldName="overwriteCharacterScenario"
          label="Overwrite character's scenario"
          helperText="If the character already has a scenario, overwrite it with this one. Otherwise, append to it."
          value={state.scenario?.overwriteCharacterScenario}
        />

        <TextInput
          fieldName="instructions"
          isMultiline
          label="User Instructions"
          helperText="Optional. Text to display to the user to help them understand how to use this scenario."
          placeholder="Thanks for trying out my scenario! Use the Trigger Event menu to move the story forward."
          value={state.scenario?.instructions}
        />

        <EditScenarioEvents editId={params.editId} form={ref} />
      </form>

      <ConfirmModal
        show={!!showDelete()}
        close={() => setShowDelete(false)}
        confirm={confirmDelete}
        message="Are you sure wish to delete this scenario?"
      />

      <ExportScenarioModal
        show={!!showDownload()}
        close={() => setShowDownload(false)}
        scenario={showDownload() ? state.scenario : undefined}
      />
    </>
  )
}

export default CreateScenario
