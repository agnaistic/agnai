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
import { useTransContext } from '@mbarzda/solid-i18next'

const CreateScenario: Component = () => {
  const [t] = useTransContext()

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
            <div>{t('edit_scenario')}</div>
            <div class="flex text-base">
              <div class="px-1">
                <Button schema="secondary" onClick={() => duplicateScenario()}>
                  <Copy />
                  <span class="hidden sm:inline">{t('duplicate')}</span>
                </Button>
              </div>
              <div class="px-1">
                <Button schema="secondary" onClick={() => setShowDownload(true)}>
                  <Download />
                  <span class="hidden sm:inline">{t('download')}</span>
                </Button>
              </div>
              <div class="px-1">
                <Button schema="red" onClick={() => setShowDelete(true)}>
                  <Trash />
                  <span class="hidden sm:inline">{t('delete')}</span>
                </Button>
              </div>
            </div>
          </div>
        }
      />

      <div class="flex items-center gap-2">
        <Show
          when={state.scenario?.entries.length ?? 0 > 0}
          fallback={<p>{t('no_events_attached_to_this_scenario')}</p>}
        >
          <p>{t('x_events', { count: state.scenario!.entries.length })}</p>
        </Show>
      </div>

      <Divider />

      <div class="text-lg font-bold">{t('scenario_details')}</div>

      <form class="flex flex-col gap-4" ref={ref}>
        <TextInput
          fieldName="name"
          required
          label={t('name')}
          helperText={t('the_name_of_your_scenario')}
          placeholder={t('my_scenario')}
          value={state.scenario?.name}
        />

        <TextInput
          fieldName="description"
          label={t('description')}
          helperText={t('more_information_about_your_scenario')}
          placeholder={t('this_scenario_is_about')}
          value={state.scenario?.description}
        />

        <TextInput
          fieldName="text"
          isMultiline
          label={t('prompt_text')}
          helperText={t('additional_text_to_add_to_the_scenario_prompt')}
          placeholder={t('scenario_example')}
          value={state.scenario?.text}
        />

        <Toggle
          fieldName="overwriteCharacterScenario"
          label={t('overwrite_characters_scenario')}
          helperText={t('if_the_character_already_has_a_scenario_overwrite_it')}
          value={state.scenario?.overwriteCharacterScenario}
        />

        <TextInput
          fieldName="instructions"
          isMultiline
          label={t('user_instructions')}
          helperText={t('text_to_display_to_the_user_to_help')}
          placeholder={t('user_instructions_example')}
          value={state.scenario?.instructions}
        />

        <EditScenarioEvents editId={params.editId} form={ref} />
      </form>

      <ConfirmModal
        show={!!showDelete()}
        close={() => setShowDelete(false)}
        confirm={confirmDelete}
        message={t('are_you_sure_you_wish_to_delete_this_scenario')}
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
