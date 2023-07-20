import { createEffect, createMemo, Match, Show, Switch } from 'solid-js'
import { Component, createSignal } from 'solid-js'
import Button from '../../shared/Button'
import Modal from '../../shared/Modal'
import { Toggle } from '../../shared/Toggle'
import { getClientPreset } from '../../shared/adapter'
import Tabs from '../../shared/Tabs'
import TextInput from '../../shared/TextInput'
import { AppSchema } from '../../../common/types/schema'
import { presetStore } from '/web/store'
import { extractSystemPromptFromLegacyGaslight } from './update-gaslight'

type ModalStep = 'step1Info' | 'step2EditingPreset'

const settingTabs = ['old', 'new'] as const
type SettingTab = (typeof settingTabs)[number]

const UpdateGaslightToUseSystemPromptModal: Component<{
  chat: AppSchema.Chat
  show: boolean
  close: () => void
}> = (props) => {
  const [modalStep, setModalStep] = createSignal<ModalStep>('step1Info')
  const [settingTab, setSettingTab] = createSignal<SettingTab>('new')
  const selectedTab = createMemo(() => settingTabs.findIndex((tab) => tab === settingTab()))
  const selectTab = (idx: number) => setSettingTab(settingTabs[idx])
  const chatPreset = createMemo(() => getClientPreset(props.chat))
  const automaticUpdate = createMemo(() =>
    extractSystemPromptFromLegacyGaslight(chatPreset()?.preset.gaslight ?? '')
  )
  const [newSystemPrompt, setNewSystemPrompt] = createSignal('')
  const [newGaslight, setNewGaslight] = createSignal(automaticUpdate().gaslight)
  const [ignoreCharacterSystemPrompt, setIgnoreCharacterSystemPrompt] = createSignal(
    chatPreset()?.preset.ignoreCharacterSystemPrompt ?? false
  )
  const [loadedExtraction, setLoadedExtraction] = createSignal(false)
  createEffect(() => {
    if (
      !loadedExtraction() &&
      automaticUpdate().gaslight !== '' &&
      automaticUpdate().gaslight !== '{{system_prompt}}\n'
    ) {
      setLoadedExtraction(true)
      setNewSystemPrompt(automaticUpdate().systemPrompt)
      setNewGaslight(automaticUpdate().gaslight)
    }
  })
  const onSave = () => {
    presetStore.updatePreset(chatPreset()?.preset._id!, {
      systemPrompt: newSystemPrompt(),
      gaslight: newGaslight(),
      ignoreCharacterSystemPrompt: ignoreCharacterSystemPrompt(),
    })
    props.close()
  }
  return (
    <Modal
      dismissable={false}
      title="Update your prompt template (aka gaslight)"
      show={props.show}
      close={props.close}
      footer={
        <Switch>
          <Match when={modalStep() === 'step1Info'}>
            <Button schema="secondary" onClick={() => setModalStep('step2EditingPreset')}>
              Next
            </Button>
          </Match>
          <Match when={modalStep() == 'step2EditingPreset'}>
            <Button schema="secondary" onClick={() => setModalStep('step1Info')}>
              Back
            </Button>
            <Button schema="primary" onClick={onSave}>
              Save
            </Button>
          </Match>
        </Switch>
      }
    >
      <div class="text-sm">
        <Show when={modalStep() === 'step1Info'}>
          This character comes with a system prompt. You must update your preset's prompt template
          (aka gaslight) to:
          <ul class="my-3 flex flex-col gap-2">
            <li>
              - Move stylistic instructions to the new System Prompt setting (e.g. "Write{' '}
              {`{{char}}`}
              's next response. Write three paragraphs.'")
            </li>
            <li>- Ensure the prompt template includes the new {'{{system_prompt}}'} placeholder</li>
          </ul>
          We've tried to automatically make the change for you. Please confirm the result.
        </Show>
        <Show when={modalStep() === 'step2EditingPreset'}>
          <Tabs tabs={['old', 'new']} selected={selectedTab} select={selectTab} />
          <Show when={settingTab() === 'old'}>
            <div class="my-2 text-base">Prompt template (gaslight)</div>
            <TextInput
              disabled
              isMultiline
              fieldName="oldGaslight"
              value={chatPreset()?.preset.gaslight}
            />
          </Show>
          <Show when={settingTab() === 'new'}>
            <div class="my-2 text-base">System prompt</div>
            <TextInput
              helperText="This field only supports the placeholders {{char}} and {{user}}."
              isMultiline
              fieldName="newSystemPrompt"
              value={newSystemPrompt()}
              onChange={(ev) => setNewSystemPrompt(ev.currentTarget.value)}
            />
            <div class="my-2 text-base">Prompt template (formerly gaslight)</div>
            <TextInput
              isMultiline
              fieldName="newGaslight"
              value={newGaslight()}
              onChange={(ev) => setNewGaslight(ev.currentTarget.value)}
            />
            <Toggle
              fieldName="ignoreCharacterSystemPrompt"
              label=<div class="mt-2 text-base">
                Override character system prompt (not recommended)
              </div>
              value={ignoreCharacterSystemPrompt()}
              onChange={(newVal) => setIgnoreCharacterSystemPrompt(newVal)}
            />
          </Show>
        </Show>
      </div>
    </Modal>
  )
}

export default UpdateGaslightToUseSystemPromptModal
