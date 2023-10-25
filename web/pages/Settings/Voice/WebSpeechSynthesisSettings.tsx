import { Component, Show } from 'solid-js'
import { isNativeSpeechSupported } from '/web/shared/Audio/speech'

const WebSpeechSynthesisSettings: Component = () => {
  return (
    <>
      <div class="text-xl">Web Speech Synthesis</div>
      <Show when={isNativeSpeechSupported()}>
        <p>
          Web Speech Synthesis is <b>supported</b>
        </p>
      </Show>
      <Show when={!isNativeSpeechSupported()}>
        <p>
          Web Speech Synthesis is <b>NOT</b> supported.
        </p>
      </Show>
    </>
  )
}

export default WebSpeechSynthesisSettings
