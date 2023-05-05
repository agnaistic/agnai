import { userStore } from '../../../store'
import { Component, createMemo, createSignal } from 'solid-js'
import ElevenLabsSettings from './ElevenLabsSettings'
import { Toggle } from '../../../shared/Toggle'
import Tabs from '../../../shared/Tabs'
import WebSpeechSynthesisSettings from './WebSpeechSynthesisSettings'
import Divider from '../../../shared/Divider'

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
        <p class="text-lg font-bold">Speech to text (Speak With Microphone)</p>

        <Toggle
          label="Enabled"
          helperText="Whether to show the microphone button."
          fieldName="speechToTextEnabled"
          value={state.user?.speechtotext?.enabled ?? true}
        />

        <Toggle
          label="Submit Automatically"
          helperText="Whether to send the message when a sentence has been completed."
          fieldName="speechToTextAutoSubmit"
          value={state.user?.speechtotext?.autoSubmit ?? true}
        />

        <Toggle
          label="Resume Listening Automatically"
          helperText="Whether to re-start recording after a message has been received."
          fieldName="speechToTextAutoRecord"
          value={state.user?.speechtotext?.autoRecord ?? true}
        />

        <Divider />

        <p class="text-lg font-bold">Speech To Text (Character Voice)</p>

        <Toggle
          label="Enabled"
          helperText="Characters with a configured voice will speak."
          fieldName="textToSpeechEnabled"
          value={state.user?.texttospeech?.enabled ?? true}
        />

        <Toggle
          label="Filter Action Text"
          helperText="Skips text in asterisks and parenthesis."
          fieldName="textToSpeechFilterActions"
          value={state.user?.texttospeech?.filterActions ?? true}
        />

        <Divider />

        <p class="text-lg font-bold">Voice Backends</p>

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
