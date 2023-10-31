import { Component, Show, JSX } from 'solid-js'
import { markdown } from './markdown'
import { Volume2, VolumeX } from 'lucide-solid'
import { AudioTrackId, audioStore } from '../store'

const VolumeControl: Component<{
  track: AudioTrackId
  label: string
  helperText?: string | JSX.Element
  helperMarkdown?: string
  disabled?: boolean
  onChange?: (value: number) => void
  parentClass?: string
}> = (props) => {
  let input: HTMLInputElement | undefined
  const audioSettings = audioStore()

  return (
    <div class={`relative pt-1 ${props.parentClass || ''}`}>
      <label class="form-label block-block">{props.label}</label>

      <Show when={props.helperText}>
        <p class="helper-text">{props.helperText}</p>
      </Show>
      <Show when={!!props.helperMarkdown}>
        <p class="helper-text markdown" innerHTML={markdown.makeHtml(props.helperMarkdown!)}></p>
      </Show>

      <ul class="flex flex-row gap-5">
        <a class="icon-button p-3" onClick={() => audioStore.toggleMuteTrack(props.track)}>
          <Show when={audioSettings.tracks[props.track].mute}>
            <VolumeX size="35" />
          </Show>
          <Show when={!audioSettings.tracks[props.track].mute}>
            <Volume2 size="35" />
          </Show>
        </a>

        <input
          ref={input}
          type="range"
          class="
                my-auto
                h-1
                w-full
                cursor-ew-resize
                appearance-none
                rounded-xl
                text-opacity-50
                accent-[var(--hl-400)]
                focus:shadow-none focus:outline-none focus:ring-0
                "
          min="0"
          max="100"
          step="1"
          disabled={props.disabled}
        />
      </ul>
    </div>
  )
}

export default VolumeControl
