import { userStore } from '../../../store'
import { Component, Show, createMemo, createSignal } from 'solid-js'
import { Toggle } from '../../../shared/Toggle'
import Tabs from '../../../shared/Tabs'
import ElevenLabsSettings from './ElevenLabsSettings'
import WebSpeechSynthesisSettings from './WebSpeechSynthesisSettings'
import NovelTtsSettings from './NovelTtsSettings'
import Divider from '../../../shared/Divider'
import { getSpeechRecognition } from '../../Chat/components/SpeechRecognitionRecorder'
import { useTransContext } from '@mbarzda/solid-i18next'
import { TFunction } from 'i18next'

const ttsServiceTabs = (t: TFunction) => ({
  webspeechsynthesis: t('web_speech_synthesis'),
  elevenlabs: t('ElevenLabs'),
  novel: t('novel_ai_text_to_speech'),
})

type Tab = 'webspeechsynthesis' | 'elevenlabs' | 'novel'

export const VoiceSettings: Component = () => {
  const [t] = useTransContext()

  const state = userStore()

  const [tab, setTab] = createSignal(0)
  const tabs: Tab[] = ['webspeechsynthesis', 'elevenlabs', 'novel']
  const currentTab = createMemo(() => tabs[tab()])
  const subclass = 'flex flex-col gap-4'

  return (
    <>
      <div class="flex flex-col gap-4">
        <p class="text-lg font-bold">{t('speech_to_text_speak_with_microphone')}</p>

        <Show
          when={getSpeechRecognition()}
          fallback={
            <p class="text-red-800">{t('speech_to_text_is_not_available_in_your_browser')}</p>
          }
        >
          <p class="italic">{t('you_can_use_speech_recognition')}</p>

          <Toggle
            label={t('enabled')}
            helperText={t('whether_to_show_the_microphone_button')}
            fieldName="speechToTextEnabled"
            value={state.user?.speechtotext?.enabled ?? true}
          />

          <Toggle
            label={t('submit_automatically')}
            helperText={t('whether_to_send_message_when_a_sentence_has_been_completed')}
            fieldName="speechToTextAutoSubmit"
            value={state.user?.speechtotext?.autoSubmit ?? true}
          />

          <Toggle
            label={t('resume_listening_automatically')}
            helperText={t('whether_to_restart_recording_after_a_message_has_been_received')}
            fieldName="speechToTextAutoRecord"
            value={state.user?.speechtotext?.autoRecord ?? true}
          />
        </Show>

        <Divider />

        <p class="text-lg font-bold">{t('text_to_speech_character_voice')}</p>

        <p class="italic">{t('you_need_to_configure_a_voice_on_the_characters_edit_page')}</p>

        <Toggle
          label={t('enabled')}
          helperText={t('characters_with_a_configured_voice_will_speak_automatically')}
          fieldName="textToSpeechEnabled"
          value={state.user?.texttospeech?.enabled ?? true}
        />

        <Toggle
          label={t('filter_action_text')}
          helperText={t('skip_text_in_asterisks_and_parenthesis')}
          fieldName="textToSpeechFilterActions"
          value={state.user?.texttospeech?.filterActions ?? true}
        />

        <Divider />

        <p class="text-lg font-bold">{t('voice_services')}</p>

        <div class="my-2">
          <Tabs
            tabs={tabs.map((label) => ttsServiceTabs(t)[label])}
            selected={tab}
            select={setTab}
          />
        </div>

        <div class="flex flex-col gap-4">
          <div class={currentTab() === 'webspeechsynthesis' ? subclass : 'hidden'}>
            <WebSpeechSynthesisSettings />
          </div>

          <div class={currentTab() === 'elevenlabs' ? subclass : 'hidden'}>
            <ElevenLabsSettings />
          </div>

          <div class={currentTab() === 'novel' ? subclass : 'hidden'}>
            <NovelTtsSettings />
          </div>
        </div>
      </div>
    </>
  )
}
