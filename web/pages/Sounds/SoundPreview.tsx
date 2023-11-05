import { Component, Show, createSignal } from 'solid-js'
import { Sound } from '/web/shared/Audio/soundpack'
import { Pause, Play } from 'lucide-solid'
import Button from '/web/shared/Button'
import { audioStore } from '/web/store'

export const SoundPreview: Component<{
  sound?: Sound | undefined
}> = (props) => {
  const audioSettings = audioStore()
  let audioElem: HTMLAudioElement | undefined
  let [playing, setPlaying] = createSignal(false)

  const play = (src: string) => {
    if (!src) return
    if (playing()) stop()

    setPlaying(true)
    audioElem = new Audio()
    audioElem.src = src
    audioElem.volume = audioSettings.tracks.master.volume / 100
    audioElem.onended = () => stop()
    audioElem.play()
  }

  const stop = () => {
    if (!playing()) return
    if (!audioElem) return

    audioElem.pause()
    audioElem.onended = null
    audioElem = undefined
    setPlaying(false)
  }

  return (
    <Button
      onClick={() => {
        if (!playing()) {
          play(getSoundSource(props.sound))
        } else {
          stop()
        }
      }}
    >
      <Show when={playing()} fallback={<Play />}>
        <Pause />
      </Show>
    </Button>
  )
}

export function getSoundSource(sound: Sound | undefined) {
  if (!sound) return ''

  if ('url' in sound.source) {
    return sound.source.url
  }
  if ('key' in sound.source) {
    return sound.source.key
  }
  if ('path' in sound.source) {
    return sound.source.path
  }

  return ''
}
