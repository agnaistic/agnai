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
import { userStore } from '../../../store'
import { AppSchema } from '../../../../srv/db/schema'

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

export const SpeechRecognitionRecorder: Component<{
  culture?: string
  class?: string
  onText: (value: string) => void
  onSubmit: () => void
  cleared: Accessor<number>
  enabled: boolean
}> = (props) => {
  const settings = userStore((s) => ({ ...defaultSettings, ...s.user?.speechtotext }))

  const [finalValue, setFinalValue] = createSignal('')
  const [interimValue, setInterimValue] = createSignal('')
  const [isListening, setIsListening] = createSignal(false)
  const [isHearing, setIsHearing] = createSignal(false)
  const [speechRecognition, setSpeechRecognition] = createSignal<SpeechRecognition>()
  const [pendingRecord, setPendingRecord] = createSignal(false)

  onMount(() => {
    const w = window as any
    const speechRecognitionCtor: SpeechRecognitionCtor =
      w.SpeechRecognition || w.speechRecognition || w.webkitSpeechRecognition
    if (!speechRecognitionCtor) return

    const recognition = new speechRecognitionCtor() as SpeechRecognition
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = props.culture ?? defaultCulture

    recognition.addEventListener('result', (event) => {
      setPendingRecord(false)
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
            recognition.abort()
            setIsListening(false)
          }
          interimTranscript = ' '
        } else {
          interimTranscript += transcript
        }
      }

      setInterimValue(capitalizeInterim(interimTranscript))
    })

    recognition.addEventListener('error', () => {
      setIsListening(false)
    })

    recognition.addEventListener('end', () => {
      setIsListening(false)
    })

    recognition.addEventListener('speechstart', () => {
      setIsHearing(true)
    })

    recognition.addEventListener('speechend', () => {
      setIsHearing(false)
    })

    setSpeechRecognition(recognition)
  })

  createEffect(() => {
    if (!props.enabled && isListening()) {
      speechRecognition()?.abort()
      setIsListening(false)
    } else if (props.enabled && !isListening() && pendingRecord()) {
      setTimeout(() => {
        if (isListening()) return
        setIsListening(true)
        speechRecognition()?.start()
      }, 100)
    }
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
    props.onText(composedValue())
  })

  createEffect(() => {
    const final = finalValue()
    if (!final) return
    if (settings.autoSubmit) props.onSubmit()
    setPendingRecord(settings.autoRecord)
  })

  const toggleListening = () => {
    const listening = isListening()
    const speech = speechRecognition()
    if (!speech) return
    if (listening) {
      speech.abort()
      setIsListening(false)
    } else if (props.enabled) {
      speech.start()
      setIsListening(true)
    } else {
      setPendingRecord(!pendingRecord())
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
