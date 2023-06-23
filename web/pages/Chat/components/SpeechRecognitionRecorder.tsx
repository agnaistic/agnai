import {
  Accessor,
  Component,
  Show,
  createEffect,
  createMemo,
  createSignal,
  on,
  onCleanup,
  onMount,
} from 'solid-js'
import { Mic } from 'lucide-solid'
import Button from '../../../shared/Button'
import { defaultCulture } from '../../../shared/CultureCodes'
import { msgStore, toastStore, userStore } from '../../../store'
import { AppSchema } from '../../../../common/types/schema'

const win: any = window

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  abort: () => void
}

type SpeechRecognitionCtor = {
  prototype: SpeechRecognition
  new (): SpeechRecognition
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}

const defaultSettings: AppSchema.User['speechtotext'] = {
  enabled: true,
  autoRecord: true,
  autoSubmit: true,
}

export function getSpeechRecognition(): SpeechRecognitionCtor | undefined {
  return win.SpeechRecognition || win.speechRecognition || win.webkitSpeechRecognition
}

export const SpeechRecognitionRecorder: Component<{
  culture?: string
  class?: string
  onText: (value: string) => void
  onSubmit: () => void
  cleared: Accessor<number>
}> = (props) => {
  const settings = userStore((s) => ({ ...defaultSettings, ...s.user?.speechtotext }))

  const [finalValue, setFinalValue] = createSignal('')
  const [interimValue, setInterimValue] = createSignal('')
  const [isListening, setIsListening] = createSignal(false)
  const [isHearing, setIsHearing] = createSignal(false)
  const [speechRecognition, setSpeechRecognition] = createSignal<SpeechRecognition>()
  const [pendingRecord, setPendingRecord] = createSignal(false)

  onMount(() => {
    let speech: SpeechRecognition
    try {
      const Speech = getSpeechRecognition()
      if (!Speech) return
      speech = new Speech()
    } catch (e: any) {
      toastStore.error(`Could not initialize speech recognition: ${e.message}`)
      return
    }

    speech.continuous = true
    speech.interimResults = true
    speech.lang = props.culture ?? defaultCulture

    speech.addEventListener('result', (event) => {
      const speechEvent = event as SpeechRecognitionEvent
      let interimTranscript = ''

      for (let i = speechEvent.resultIndex; i < speechEvent.results.length; ++i) {
        const transcript = speechEvent.results[i][0].transcript

        if (speechEvent.results[i].isFinal) {
          let interim = capitalizeInterim(transcript)
          if (interim != '') {
            let final = finalValue()
            final = composeValues(final, interim) + '.'
            setFinalValue(final)
            speech.abort()
            setIsListening(false)
          }
          interimTranscript = ' '
        } else {
          interimTranscript += transcript
        }
      }

      setInterimValue(capitalizeInterim(interimTranscript))
    })

    speech.addEventListener('error', () => {
      setIsListening(false)
    })

    speech.addEventListener('end', () => {
      setIsListening(false)
    })

    speech.addEventListener('speechstart', () => {
      setIsHearing(true)
    })

    speech.addEventListener('speechend', () => {
      setIsHearing(false)
    })

    setSpeechRecognition(speech)
  })

  onCleanup(() => {
    speechRecognition()?.abort()
    setIsListening(false)
  })

  const composeValues = (previous: string, interim: string) => {
    let spacing = ''
    if (previous.endsWith('.')) spacing = ' '
    return previous + spacing + interim
  }

  const composedValue = createMemo(() => {
    return composeValues(finalValue(), interimValue())
  })

  createEffect(
    on(
      () => props.cleared(),
      () => {
        const speech = speechRecognition()
        if (!speech) return
        const listens = isListening()
        if (listens) {
          speech.abort()
        }
        setFinalValue('')
        setInterimValue('')
        if (listens) {
          setTimeout(() => {
            if (isListening()) return
            speech.start()
            setIsListening(true)
          }, 100)
        }
      }
    )
  )

  createEffect(() => {
    const value = composedValue()
    if (!value) return
    props.onText(value)
  })

  createEffect(() => {
    const final = finalValue()
    if (!final) return
    if (settings.autoSubmit) {
      setPendingRecord(settings.autoRecord)
      setTimeout(() => {
        props.onSubmit()
      }, 100)
    }
  })

  const unsub = msgStore.subscribe((state) => {
    if (state.speaking && isListening()) {
      setPendingRecord(true)
      speechRecognition()?.abort()
      setIsListening(false)
      return
    }

    if (
      !settings.enabled ||
      isListening() ||
      !pendingRecord() ||
      state.speaking ||
      state.partial ||
      state.waiting ||
      state.msgs.length === 0
    ) {
      return
    }

    const lastMsg = state.msgs[state.msgs.length - 1]
    if (!lastMsg?.characterId) return
    setPendingRecord(false)
    speechRecognition()?.start()
    setIsListening(true)
  })

  onCleanup(() => {
    unsub()
  })

  const toggleListening = () => {
    const listening = isListening()
    const speech = speechRecognition()
    setPendingRecord(false)
    if (!speech) return
    if (listening) {
      speech.abort()
      setIsListening(false)
    } else {
      speech.start()
      setIsListening(true)
    }
  }

  function capitalizeInterim(interimTranscript: string) {
    let capitalizeIndex = -1
    if (interimTranscript.length > 2 && interimTranscript[0] === ' ') capitalizeIndex = 1
    else if (interimTranscript.length > 1) capitalizeIndex = 0
    if (capitalizeIndex > -1) {
      const spacing = capitalizeIndex > 0 ? ' '.repeat(capitalizeIndex - 1) : ''
      const capitalized = interimTranscript[capitalizeIndex].toLocaleUpperCase()
      const rest = interimTranscript.substring(capitalizeIndex + 1)
      interimTranscript = spacing + capitalized + rest
    }
    return interimTranscript
  }

  return (
    <>
      <Show when={speechRecognition() && settings.enabled}>
        <Button
          class={`absolute ${
            props.class
          } top-1/2 -translate-y-1/2 transform rounded bg-transparent ${
            isListening() ? 'text-red-500' : 'text-gray-500'
          }`}
          onClick={toggleListening}
        >
          <Mic
            size={18}
            classList={{
              'animate-pulse': pendingRecord() || isHearing(),
            }}
          />
        </Button>
      </Show>
    </>
  )
}
