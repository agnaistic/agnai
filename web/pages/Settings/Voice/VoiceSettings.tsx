import { userStore } from '../../../store'
import { Component, createMemo, createSignal } from 'solid-js'
import ElevenLabsSettings from './ElevenLabsSettings'
import { Toggle } from '../../../shared/Toggle'
import Tabs from '../../../shared/Tabs'
import WebSpeechSynthesisSettings from './WebSpeechSynthesisSettings'

const ttsBackendTabs = {
  webspeechsynthesis: 'Web Speech Synthesis',
  elevenlabs: 'ElevenLabs',
}

type Tab = keyof typeof ttsBackendTabs

export const VoiceSettings: Component = () => {
  const state = userStore()

  const [tab, setTab] = createSignal(0)
  const tabs: Tab[] = ['webspeechsynthesis', 'elevenlabs']
  const currentTab = createMemo(() => tabs[tab()])
  const subclass = 'flex flex-col gap-4'

  return (
    <>
      <div class="flex flex-col gap-4">
        <Toggle
          label="Filter actions"
          helperText="Skips text in asterisks and parenthesis."
          fieldName="textToSpeechFilterActions"
          value={state.user?.texttospeech?.filterActions ?? true}
        />

        <div class="my-2">
          <Tabs tabs={tabs.map((t) => ttsBackendTabs[t])} selected={tab} select={setTab} />
        </div>

        <div class="flex flex-col gap-4">
          <div class={currentTab() === 'webspeechsynthesis' ? subclass : 'hidden'}>
            <WebSpeechSynthesisSettings />
          </div>

          <div class={currentTab() === 'elevenlabs' ? subclass : 'hidden'}>
            <ElevenLabsSettings />
          </div>
        </div>
      </div>
    </>
  )
}
