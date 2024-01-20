import { Component, Show } from 'solid-js'
import { isNativeSpeechSupported } from '/web/shared/Audio/speech'
import { Trans, useTransContext } from '@mbarzda/solid-i18next'

const WebSpeechSynthesisSettings: Component = () => {
  const [t] = useTransContext()

  return (
    <>
      <div class="text-xl">{t('web_speech_synthesis')}</div>
      <Show when={isNativeSpeechSupported()}>
        <p>
          <Trans key="web_speech_synthesis_is_supported">
            Web Speech Synthesis is <b>supported</b>
          </Trans>
        </p>
      </Show>
      <Show when={!isNativeSpeechSupported()}>
        <p>
          <Trans key="web_speech_synthesis_is_not_supported">
            Web Speech Synthesis is <b>NOT</b> supported.
          </Trans>
        </p>
      </Show>
    </>
  )
}

export default WebSpeechSynthesisSettings
