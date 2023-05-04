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

export const SpeechRecognitionRecorder: Component<{
  culture?: string
  class?: string
  onText: (value: string) => void
  onEnd: () => void
  cleared: Accessor<number>
}> = (props) => {
  const [finalValue, setFinalValue] = createSignal('')
  const [interimValue, setInterimValue] = createSignal('')
  const [isListening, setIsListening] = createSignal(false)
  const [isHearing, setIsHearing] = createSignal(false)
  const [speechRecognition, setSpeechRecognition] = createSignal<SpeechRecognition>()

  onMount(() => {
    const w = window as any
    const speechRecognitionCtor: SpeechRecognitionCtor =
      w.SpeechRecognition || w.speechRecognition || w.webkitSpeechRecognition
    if (!speechRecognitionCtor) return

    const recognition = new speechRecognitionCtor() as SpeechRecognition
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = props.culture ?? 'en-us'

    recognition.addEventListener('result', (event) => {
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

  onCleanup(() => {
    speechRecognition()?.abort()
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
    props.onEnd()
  })

  const toggleListening = () => {
    const speech = speechRecognition()
    if (!speech) return
    if (isListening()) {
      speech.stop()
    } else {
      speech.start()
    }
    setIsListening(!isListening())
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
      <Show when={speechRecognition()}>
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
              'animate-pulse': isHearing(),
            }}
          />
        </Button>
      </Show>
    </>
  )
}
