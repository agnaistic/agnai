import { Component, Show } from 'solid-js'
import { userStore } from '../../../store'

const WebSpeechSynthesisSettings: Component = () => {
  const state = userStore()

  return (
    <>
      <div class="text-xl">Web Speech Synthesis</div>
      <Show when={window.speechSynthesis}>
        <p>
          Web Speech Synthesis is <b>supported</b>
        </p>
      </Show>
      <Show when={!window.speechSynthesis}>
        <p>
          Web Speech Synthesis is <b>NOT</b> supported.
        </p>
      </Show>
    </>
  )
}

export default WebSpeechSynthesisSettings
