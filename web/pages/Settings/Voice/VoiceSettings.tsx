import { Component, Show, createMemo, createSignal } from 'solid-js'
import { Toggle } from '../../../shared/Toggle'
import Tabs from '../../../shared/Tabs'
import ElevenLabsSettings from './ElevenLabsSettings'
import WebSpeechSynthesisSettings from './WebSpeechSynthesisSettings'
import NovelTtsSettings from './NovelTtsSettings'
import Divider from '../../../shared/Divider'
import { getSpeechRecognition } from '../../Chat/components/SpeechRecognitionRecorder'
import AgnaisticSettings from './AgnaisticSettings'
import { isAgnaisticSpeechAllowed } from '/web/shared/Audio/speech'
import { AppSchema } from '/common/types/index'
import { SetStoreFunction } from 'solid-js/store'
import { applyStoreProperty } from '/web/shared/util'

const ttsServiceTabs = {
  agnaistic: 'Agnaistic',
  webspeechsynthesis: 'Web Speech Synthesis',
  elevenlabs: 'ElevenLabs',
  novel: 'NovelAI Text To Speech',
}

type Tab = keyof typeof ttsServiceTabs

export const VoiceSettings: Component<{
  state: AppSchema.User
  setter: SetStoreFunction<AppSchema.User>
}> = (props) => {
  const canUseTts = createMemo(() => {
    return isAgnaisticSpeechAllowed()
  })

  const [tab, setTab] = createSignal(0)

  const tabs = createMemo(() => {
    const opts: Tab[] = ['webspeechsynthesis', 'elevenlabs', 'novel']
    if (canUseTts()) {
      opts.unshift('agnaistic')
    }
    return opts
  })

  const currentTab = createMemo(() => tabs()[tab()])
  const subclass = 'flex flex-col gap-4'

  return (
    <>
      <div class="flex flex-col gap-4">
        <p class="text-lg font-bold">Speech to text (Speak with Microphone)</p>

        <Show
          when={getSpeechRecognition()}
          fallback={<p class="text-red-800">Speech to text is not available in your browser</p>}
        >
          <p class="italic">
            You can use speech recognition by using the microphone icon in the input text box.
          </p>

          <Toggle
            label="Enabled"
            helperText="Whether to show the microphone button."
            fieldName="speechToTextEnabled"
            value={props.state.speechtotext?.enabled ?? true}
            onChange={(ev) =>
              props.setter(
                'speechtotext',
                applyStoreProperty(props.state.speechtotext, 'enabled', ev)
              )
            }
          />

          <Toggle
            label="Submit Automatically"
            helperText="Whether to send the message when a sentence has been completed."
            fieldName="speechToTextAutoSubmit"
            value={props.state.speechtotext?.autoSubmit ?? true}
            onChange={(ev) =>
              props.setter(
                'speechtotext',
                applyStoreProperty(props.state.speechtotext, 'autoSubmit', ev)
              )
            }
          />

          <Toggle
            label="Resume Listening Automatically"
            helperText="Whether to re-start recording after a message has been received."
            fieldName="speechToTextAutoRecord"
            value={props.state.speechtotext?.autoRecord ?? true}
            onChange={(ev) =>
              props.setter(
                'speechtotext',
                applyStoreProperty(props.state.speechtotext, 'autoRecord', ev)
              )
            }
          />
        </Show>

        <Divider />

        <p class="text-lg font-bold">Text to Speech (Character Voice)</p>

        <p class="italic">You need to configure a voice on the character's edit page.</p>

        <Toggle
          label="Enabled"
          helperText="Characters with a configured voice will speak automatically."
          fieldName="textToSpeechEnabled"
          value={props.state.texttospeech?.enabled ?? true}
          onChange={(ev) =>
            props.setter(
              'texttospeech',
              applyStoreProperty(props.state.texttospeech, 'enabled', ev)
            )
          }
        />

        <Toggle
          label="Filter Action Text"
          helperText="Skips text in asterisks and parenthesis."
          fieldName="textToSpeechFilterActions"
          value={props.state.texttospeech?.filterActions ?? true}
          onChange={(ev) =>
            props.setter(
              'texttospeech',
              applyStoreProperty(props.state.texttospeech, 'filterActions', ev)
            )
          }
        />

        <Divider />

        <p class="text-lg font-bold">Voice Services</p>

        <div class="my-2">
          <Tabs tabs={tabs().map((t) => ttsServiceTabs[t])} selected={tab} select={setTab} />
        </div>

        <div class="flex flex-col gap-4">
          <div class={currentTab() === 'agnaistic' ? subclass : 'hidden'}>
            <AgnaisticSettings />
          </div>

          <div class={currentTab() === 'webspeechsynthesis' ? subclass : 'hidden'}>
            <WebSpeechSynthesisSettings />
          </div>

          <div class={currentTab() === 'elevenlabs' ? subclass : 'hidden'}>
            <ElevenLabsSettings state={props.state} setter={props.setter} />
          </div>

          <div class={currentTab() === 'novel' ? subclass : 'hidden'}>
            <NovelTtsSettings />
          </div>
        </div>
      </div>
    </>
  )
}
