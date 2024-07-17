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
import { createDebounce } from '/web/shared/util'

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
  listening: (state: boolean) => void
}> = (props) => {
  const settings = userStore((s) => ({ ...defaultSettings, ...s.user?.speechtotext }))

  const [scripts, setScripts] = createSignal<string[]>([])
  const [isListening, setIsListening] = createSignal(false)
  const [isHearing, setIsHearing] = createSignal(false)
  const [speechRecognition, setSpeechRecognition] = createSignal<SpeechRecognition>()
  const [pendingRecord, setPendingRecord] = createSignal(false)

  createEffect(() => {
    const next = isListening()
    props.listening(next)
  })

  const [complete] = createDebounce((speech: SpeechRecognition, text: string) => {
    const transcript = capitalize(text)
    speech.abort()
    props.onText(transcript)
    setPendingRecord(settings.autoRecord)
    props.onSubmit()
  }, 1500)

  onMount(async () => {
    let speech: SpeechRecognition
    try {
      // await window.navigator.mediaDevices.getUserMedia({ video: false, audio: true })
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

      const script = extractTranscript(speechEvent)
      setScripts(script.texts.map(capitalize))
      let foo: string[] = []
      let finals = 0
      for (const res of speechEvent.results) {
        if (res.isFinal) finals++
        for (const item of res) {
          foo.push(item.transcript)
        }
      }

      for (let i = speechEvent.resultIndex; i < speechEvent.results.length; ++i) {
        const result = speechEvent.results[i]
        const transcript = capitalize(result[0].transcript)
        props.onText(transcript)

        if (result.isFinal && transcript !== '' && settings.autoSubmit) {
          complete(speech, transcript)
        }
      }
    })

    speech.addEventListener('error', (_err) => {
      setIsListening(false)
    })

    speech.addEventListener('end', (_reason) => {
      setIsListening(false)
    })

    speech.addEventListener('speechstart', () => {
      setIsHearing(true)
    })

    speech.addEventListener('speechend', (_event) => {
      setIsHearing(false)
      // let value = composedValue()
      // if (!value) return

      // props.onText(value)
    })

    setSpeechRecognition(speech)
  })

  onCleanup(() => {
    speechRecognition()?.abort()
    setIsListening(false)
  })

  // const composeValues = (previous: string, interim: string) => {
  //   let spacing = ''
  //   if (previous.endsWith('.')) spacing = ' '
  //   return previous + spacing + interim
  // }

  const composedValue = createMemo(() => {
    let value = scripts().join('. ')
    return value
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
        setScripts([])
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
    props.listening(true)
    if (listening) {
      speech.abort()
      setIsListening(false)
    } else {
      speech.start()
      setIsListening(true)
    }
  }

  return (
    <>
      <Show when={speechRecognition() && settings.enabled}>
        <Button
          schema="clear"
          class={`${isListening() ? 'text-red-500' : 'text-gray-500'} ${props.class || ''} `}
          onClick={toggleListening}
        >
          <Mic
            size={18}
            class="h-6"
            classList={{
              'animate-pulse': pendingRecord() || isHearing(),
            }}
          />
        </Button>
      </Show>
    </>
  )
}

function extractTranscript(ev: SpeechRecognitionEvent) {
  const results = Array.from(ev.results)
  const texts: string[] = []
  for (const result of results) {
    const text = result[0].transcript
    if (!text) continue
    texts.push(text)
  }

  let transcript = texts.map(capitalize).join('. ')
  if (transcript.length && !transcript.endsWith('.')) {
    transcript += '.'
  }

  return { texts, transcript }
}

function capitalize(text: string) {
  let capitalizeIndex = -1
  if (text.length > 2 && text[0] === ' ') capitalizeIndex = 1
  else if (text.length > 1) capitalizeIndex = 0
  if (capitalizeIndex > -1) {
    const spacing = capitalizeIndex > 0 ? ' '.repeat(capitalizeIndex - 1) : ''
    const capitalized = text[capitalizeIndex].toLocaleUpperCase()
    const rest = text.substring(capitalizeIndex + 1)
    text = spacing + capitalized + rest
  }
  return text
}
