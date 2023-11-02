import { Component, Show, JSX } from 'solid-js'
import { markdown } from './markdown'
import { Volume2, VolumeX } from 'lucide-solid'
import { AudioTrackId, audioStore } from '../store'

const VolumeControl: Component<{
  trackId: AudioTrackId
  label: string
  helperText?: string | JSX.Element
  helperMarkdown?: string
  onChange?: (value: number) => void
  parentClass?: string
}> = (props) => {
  let input: HTMLInputElement | undefined

  const audio = audioStore()

  const isMaster = () => props.trackId === 'master'
  const masterMuted = () => audio.tracks.master.muted
  const trackMuted = () => audio.tracks[props.trackId].muted
  const disabled = () => trackMuted() || masterMuted()
  const displayedVolume = () => (disabled() ? 0 : audio.tracks[props.trackId].volume) + '%'

  const onInput: JSX.EventHandler<HTMLInputElement, InputEvent> = (event) => {
    audioStore.setTrackVolume(props.trackId, +event.currentTarget.value)
    props.onChange?.(+event.currentTarget.value)
  }

  return (
    <div class={`relative pt-1 ${props.parentClass || ''}`}>
      <label class="form-label block-block">{props.label}</label>

      <Show when={props.helperText}>
        <p class="helper-text">{props.helperText}</p>
      </Show>
      <Show when={!!props.helperMarkdown}>
        <p class="helper-text markdown" innerHTML={markdown.makeHtml(props.helperMarkdown!)}></p>
      </Show>

      <ul class="flex flex-row content-center gap-5">
        <a
          class="icon-button p-3"
          onClick={() => {
            if (masterMuted() && !isMaster()) return
            audioStore.toggleMuteTrack(props.trackId)
          }}
        >
          <Show when={disabled()} fallback={<Volume2 size="35" />}>
            <VolumeX size="35" />
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
          value={disabled() ? 0 : audio.tracks[props.trackId].volume}
          style={{ 'background-size': displayedVolume() }}
          disabled={disabled()}
          onInput={onInput}
        />

        <div class="my-auto mr-5 w-1/12 text-right">
          <Show when={!disabled()}>{displayedVolume()}</Show>
        </div>
      </ul>
    </div>
  )
}

export default VolumeControl
