import {
  Component,
  Show,
  createEffect,
  createMemo,
  createSignal,
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
  value: string
  onText: (value: string) => void
  onEnd: () => void
}> = (props) => {
  const [finalValue, setFinalValue] = createSignal('')
  const [interimValue, setInterimValue] = createSignal('')
  const [isListening, setIsListening] = createSignal(false)
  const [isHearing, setIsHearing] = createSignal(false)
  const [speechRecognition, setSpeechRecognition] = createSignal<any>(null)

  createEffect(() => {
    setFinalValue(props.value)
    setInterimValue('')
  })

  onMount(() => {
    const w = window as any
    const speechRecognitionCtor: SpeechRecognitionCtor =
      w.SpeechRecognition || w.speechRecognition || w.webkitSpeechRecognition
    if (!speechRecognitionCtor) return

    const recognition = new speechRecognitionCtor() as SpeechRecognition
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.addEventListener('result', (event) => {
      const speechEvent = event as SpeechRecognitionEvent
      let interimTranscript = ''

      for (let i = speechEvent.resultIndex; i < speechEvent.results.length; ++i) {
        const transcript = speechEvent.results[i][0].transcript

        if (speechEvent.results[i].isFinal) {
          setFinalValue(composeValues(finalValue(), capitalizeInterim(transcript)) + '.')
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

  const compositeValue = createMemo(() => composeValues(finalValue(), interimValue()))

  const toggleListening = () => {
    if (isListening()) {
      speechRecognition().stop()
    } else {
      speechRecognition().start()
    }
    setIsListening(!isListening())
  }

  const onInput = (value: string) => {
    var actualFinal = finalValue()
    var actualInterim = interimValue()
    setFinalValue(value)
    const rec = speechRecognition()
    if (!rec) return
    rec.abort()
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
      console.log(spacing, capitalized, rest)
    }
    return interimTranscript
  }

  return (
    <>
      <Show when={speechRecognition()}>
        <div class="relative">
          <input
            type="text"
            class="w-full rounded-md border-2 p-2 text-black"
            value={compositeValue()}
            onInput={(e) => onInput(e.currentTarget.value)}
          />
          <Button
            class={`absolute right-2 top-1/2 -translate-y-1/2 transform bg-transparent ${
              isListening() ? 'text-red-500' : 'text-gray-500'
            }`}
            onClick={toggleListening}
          >
            <Mic
              classList={{
                'animate-pulse': isHearing(),
              }}
            />
          </Button>
        </div>
      </Show>
    </>
  )
}
