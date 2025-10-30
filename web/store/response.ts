import { createStore, getStore } from './create'
import { embedApi } from './embeddings'
import { subscribe } from './socket'
import { toastStore } from './toasts'
import { botGen, GenerateOpts } from './data/bot-generate'
import { JsonField, TickHandler } from '/common/prompt'
import { AppSchema } from '/common/types/schema'
import { createDebounce } from '/web/shared/util'
import { createSpeech, isNativeSpeechSupported, stopSpeech } from '../shared/Audio/speech'
import { VoiceSettings, VoiceWebSynthesisSettings } from '/common/types/texttospeech-schema'
import { defaultCulture } from '../shared/CultureCodes'
import { voiceApi } from './data/voice'
import { v4 } from 'uuid'
import { msgsApi } from './data/messages'
import { debug } from '/common/debug'
import { EVENTS, events } from '../emitter'
import { getScenarioEventType } from '/common/scenario'

export type VoiceState = 'generating' | 'playing'

export type ResponseState = {
  partialId?: string
  partial?: string

  /** Primarily controlled in bot-gen, but can be cleared in here in specific error conditions */
  waiting?: {
    started: number
    signal?: AbortController
    chatId: string
    mode?: GenerateOpts['kind']
    input?: string
    userId?: string
    characterId: string
    messageId?: string
  }

  speaking?: { messageId: string; status: VoiceState }
  retrying?: AppSchema.ChatMessage
}

type SendModes =
  | 'send'
  | 'ooc'
  | 'send-event:world'
  | 'send-event:character'
  | 'send-event:hidden'
  | 'send-event:ooc'
  | 'retry'
  | 'self'
  | 'send-noreply'

export const responseStore = createStore<ResponseState>(
  'responses',
  {}
)((getter, setter) => {
  return {
    abortMessage(state) {
      if (!state.waiting) return
      state.waiting.signal?.abort?.()
      debug('waiting')('abort')
      return { waiting: undefined, partial: undefined, retrying: undefined }
    },

    async *retry(_, opts: { chatId: string; msgId?: string }) {
      const { msgs, activeCharId } = getStore('messages').getState()

      if (!opts.chatId) {
        toastStore.error('Could not send message: No active chat')
        yield { partial: undefined }
        return
      }

      if (msgs.length === 0) {
        responseStore.request(opts.chatId, activeCharId)
        return
      }

      const msg = opts.msgId ? msgs.find((msg) => msg._id === opts.msgId)! : msgs[msgs.length - 1]
      const replace = msg?.userId ? undefined : { ...msg, voiceUrl: undefined }
      const signal = new AbortController()

      yield { partial: '', retrying: replace }

      const res = await botGen
        .stream({ signal, kind: 'retry', messageId: opts.msgId }, (_, state) => {
          if (state === 'done') {
            setter({ partial: undefined, retrying: undefined })
          }
        })
        .catch((err) => ({ error: err.message, result: undefined }))

      if (res.error) {
        toastStore.error(`(Retry) Generation request failed: ${res.error?.error || res.error}`)
        yield { partial: undefined, retrying: undefined }
      }
    },

    async *retrySchema(_, chatId: string, messageId: string) {
      const { msgs, activeCharId } = getStore('messages').getState()

      if (!chatId) {
        toastStore.error('Could not send message: No active chat')
        yield { partial: undefined }
        return
      }

      if (msgs.length === 0) {
        responseStore.request(chatId, activeCharId)
        return
      }

      const msg = msgs.find((msg) => msg._id === messageId)
      if (!msg) {
        toastStore.error(`Could not regenerate: Message not found`)
        yield { partial: undefined }
        return
      }

      const replace = msg?.userId ? undefined : { ...msg, voiceUrl: undefined }
      const signal = new AbortController()
      yield { partial: '', retrying: replace }

      const res = await botGen
        .stream({ signal, kind: 'retry', messageId, reschema_prompt: msg.json?.values.response })
        .catch((err) => ({ error: err.message, result: undefined }))

      if (res.error) {
        toastStore.error(`(Retry) Generation request failed: ${res.error}`)
        yield { partial: undefined, retrying: undefined }
      }
    },

    async *request(_, chatId: string, characterId: string, onSuccess?: () => void) {
      if (!chatId) {
        toastStore.error('Could not send message: No active chat')
        yield { partial: undefined }
        return
      }

      const signal = new AbortController()
      yield { partial: undefined }

      const res = await botGen
        .stream({ signal, kind: 'request', characterId })
        .catch((err) => ({ error: err.message, result: undefined }))

      if (res.error) {
        toastStore.error(`(Bot) Generation request failed: ${res.error}`)
        yield { partial: undefined }
      }

      if (res.result) onSuccess?.()
    },

    async resend(_, chatId: string, msgId: string) {
      const { msgs } = getStore('messages').getState()
      const msgIndex = msgs.findIndex((m) => m._id === msgId)

      if (msgIndex === -1) {
        toastStore.error('Cannot resend message: Message not found')
        return
      }

      const msg = msgs[msgIndex]
      responseStore.send({ chatId, msg: msg.msg, mode: 'retry' })
    },

    async *send(
      { waiting },
      opts: {
        chatId: string
        msg: string
        mode: SendModes
        onSuccess?: () => void
        onError?: (error?: string) => void
      }
    ) {
      if (waiting) return

      if (!opts.chatId) {
        toastStore.error('Could not send message: No active chat')
        yield { partial: undefined }
        return
      }

      const signal = new AbortController()

      let res: { result?: any; error?: string }

      yield { partial: '' }

      const created = await handlePreSend(opts)

      if (created?.error) {
        toastStore.error(`(Send) Message request failed: ${created?.error ?? 'Unknown error'}`)
        yield { partial: undefined, waiting: undefined }
        return
      }

      // let input = ''

      switch (opts.mode) {
        case 'send-noreply': {
          yield { partial: undefined }
          return
        }

        case 'self':
        case 'retry':
          res = await botGen
            .stream({ signal, kind: opts.mode })
            .catch((err) => ({ error: err.message, result: undefined }))
          break

        case 'send':
        case 'ooc':
        case 'send-event:world':
        case 'send-event:character':
        case 'send-event:hidden':
        case 'send-event:ooc':
          res = await botGen
            .stream({ signal, kind: opts.mode, text: opts.msg, messageId: created?.messageId })
            .catch((err) => ({ error: err.message, result: undefined }))
          if ('result' in res && !res.result?.generating) {
            yield { partial: undefined }
          }

          break

        default:
          res = { error: `Unknown mode ${opts.mode}`, result: undefined }
      }

      if (res.error) {
        toastStore.error(`(Send) Generation request failed: ${res?.error ?? 'Unknown error'}`)
        yield { partial: undefined }
      }

      if (res.result?.messageId) {
        yield { partial: '' }
      }
    },

    async *continuation(
      __,
      chatId: string,
      onSuccess?: () => void,
      retryLatestGenMoreOutput?: boolean
    ) {
      const { msgs } = getStore('messages').getState()

      if (!chatId) {
        toastStore.error('Could not send message: No active chat')
        yield { partial: undefined }
        return
      }

      const signal = new AbortController()

      const [_, replace] = msgs.slice(-2)
      yield { partial: '', retrying: replace }

      const msgState = getStore('messages').getState()
      const textBeforeGenMore = retryLatestGenMoreOutput
        ? msgState.textBeforeGenMore ?? replace.msg
        : replace.msg
      const res = await botGen
        .stream(
          {
            signal,
            kind: 'continue',
            retry: retryLatestGenMoreOutput,
          },
          (_, state) => {
            if (state === 'done') {
              setter({ partial: undefined, retrying: undefined })
            }
          }
        )
        .catch((err) => ({ error: err.message, result: undefined }))

      if (res.error) {
        toastStore.error(`(Continue) Generation request failed: ${res.error}`)
        yield { partial: undefined }
      }

      if (res.result) {
        getStore('messages').setState({ textBeforeGenMore })
        onSuccess?.()
      }
    },

    async *selfGenerate() {
      const { activeChatId } = getStore('messages').getState()
      if (!activeChatId) return
      responseStore.send({ chatId: activeChatId, msg: '', mode: 'self' })
    },

    async *chatQuery({ waiting }, message: string, onTick: TickHandler) {
      if (waiting) return
      const { activeChatId } = getStore('messages').getState()

      if (!activeChatId) {
        toastStore.error('Could not send message: No active chat')
        return
      }

      const signal = new AbortController()

      const res = await botGen
        .stream({ signal, kind: 'chat-query', text: message }, onTick)
        .catch((err) => ({ error: err.message, result: undefined }))

      if (res.error) {
        toastStore.error(`(Send) Generation request failed: ${res?.error ?? 'Unknown error'}`)
      }
    },

    async *chatJson({ waiting }, message: string, schema: JsonField[], onTick: TickHandler) {
      if (waiting) return

      const { activeChatId } = getStore('messages').getState()
      if (!activeChatId) {
        toastStore.error('Could not send message: No active chat')
        return
      }

      const signal = new AbortController()
      const res = await botGen
        .stream({ signal, kind: 'chat-query', text: message, schema }, onTick)
        .catch((err) => ({ error: err.message, result: undefined }))

      if (res.error) {
        toastStore.error(`(Send) Generation request failed: ${res?.error ?? 'Unknown error'}`)
      }
    },

    stopSpeech() {
      stopSpeech()
      return { speaking: undefined }
    },

    async *textToSpeech(
      _,
      messageId: string,
      text: string,
      voice: VoiceSettings,
      culture?: string
    ) {
      const { activeChatId, msgs } = getStore('messages').getState()
      stopSpeech()

      if (!voice.service) {
        yield { speaking: undefined }
        return
      }

      yield { speaking: { messageId, status: 'generating' } }

      if (voice.service === 'webspeechsynthesis') {
        if (!isNativeSpeechSupported()) {
          toastStore.error(`Speech synthesis not supported on this browser`)
          return
        }

        try {
          await playVoiceFromBrowser(voice, text, culture ?? defaultCulture, messageId)
        } catch (e: any) {
          toastStore.error(`Failed to play web speech synthesis: ${e.message}`)
        }

        return
      }

      const msg = msgs.find((m) => m._id === messageId)
      if (msg?.voiceUrl) {
        playVoiceFromUrl(activeChatId, messageId, msg.voiceUrl, voice.rate)
        return
      }

      const res = await voiceApi.chatTextToSpeech({
        chatId: activeChatId,
        messageId,
        text,
        voice,
        culture,
      })
      if (res.error) {
        toastStore.error(`Failed to request text to speech: ${res.error}`)
      }
    },
  }
})

/** Essentially a duplicate of `bot-generate.ts:handlePreStreamResponse` */
async function handlePreSend(opts: {
  chatId: string
  msg: string
  mode: SendModes
  onSuccess?: () => void
  onError?: (err?: string) => void
}) {
  const isEvent = opts.mode.startsWith('send-event:')
  if (!isEvent && opts.mode !== 'ooc' && opts.mode !== 'send' && opts.mode !== 'send-noreply')
    return

  const { impersonating } = getStore('character').getState()
  const { messageHistory, msgs } = getStore('messages').getState()

  const messageId = v4()

  if (opts.msg === '#FAIL') {
    return { messageId, error: 'Error test' }
  }

  const parent = botGen.getMessageParent(opts.mode, messageHistory.concat(msgs))

  const res = await msgsApi.createMessage({
    kind: isEvent ? getScenarioEventType(opts.mode) : 'send-noreply',
    chatId: opts.chatId,
    messageId,
    text: opts.msg,
    parent: parent?._id,
    character: impersonating,
    bot: false,
  })

  if (res.result) {
    opts.onSuccess?.()
  }

  if (res.error) {
    opts.onError?.(res.error)
  }

  return { messageId, error: res.error }
}

const [debouncedEmbed] = createDebounce((chatId: string, history: AppSchema.ChatMessage[]) => {
  embedApi.embedChat(chatId, history)
}, 500)

subscribe(
  'message-creating',
  { chatId: 'string', senderId: 'string?', mode: 'string?', characterId: 'string' },
  (body) => {
    const { activeChatId } = getStore('messages').getState()
    if (body.chatId !== activeChatId) return

    responseStore.setState({ partial: '' })
  }
)

subscribe(
  ['message-partial', 'inference-partial'],
  { partial: 'string', partialId: 'string?', chatId: 'string', kind: 'string?', json: 'any?' },
  (body) => {
    const { activeChatId } = getStore('messages').getState()
    const { waiting } = responseStore.getState()
    if (!waiting) return
    if (body.chatId !== activeChatId) return

    if (body.kind !== 'chat-query') {
      responseStore.setState({ partial: body.partial, partialId: body.partialId })
    }
  }
)

responseStore.subscribe((state, prev) => {
  const msgState = getStore('messages').getState()

  if (state.partial) return
  if (state.waiting) return
  if (!msgState.activeChatId) return
  if (msgState.msgs.length) return
  debouncedEmbed(msgState.activeChatId, msgState.messageHistory.concat(msgState.msgs))
})

async function playVoiceFromUrl(
  chatId: string,
  messageId: string,
  url: string,
  rate: number | undefined
) {
  const { activeChatId } = getStore('messages').getState()
  if (chatId !== activeChatId) {
    responseStore.setState({ speaking: undefined })
    return
  }
  try {
    const audio = await createSpeech({ kind: 'remote', url })

    audio.addEventListener('error', (e) => {
      console.error(e)
      toastStore.error(`Error playing URL: ${e.message}`)
      const { msgs } = getStore('messages').getState()
      const msg = msgs.find((m) => m._id === messageId)
      if (!msg) return
      const nextMsgs = msgs.map((m) => (m._id === msg._id ? { ...m, voiceUrl: undefined } : m))
      responseStore.setState({ speaking: undefined })
      getStore('messages').setState({ msgs: nextMsgs })
    })

    audio.addEventListener('playing', () => {
      const { msgs } = getStore('messages').getState()
      const msg = msgs.find((m) => m._id === messageId)
      if (!msg) return
      const nextMsgs = msgs.map((m) => (m._id === msg._id ? { ...m, voiceUrl: url } : m))
      responseStore.setState({ speaking: { messageId, status: 'playing' } })
      getStore('messages').setState({ msgs: nextMsgs })
    })
    audio.addEventListener('ended', () => {
      responseStore.setState({ speaking: undefined })
    })
    responseStore.setState({ speaking: { messageId, status: 'generating' } })
    audio.play(rate)
  } catch (e: any) {
    toastStore.error(`Error playing URL: ${e.message}`)
    responseStore.setState({ speaking: undefined })
  }
}

async function playVoiceFromBrowser(
  voice: VoiceWebSynthesisSettings,
  text: string,
  culture: string,
  messageId: string
) {
  const { user } = getStore('user').getState()
  if (!user || user?.texttospeech?.enabled === false) return
  const filterAction = user.texttospeech?.filterActions ?? true
  const audio = await createSpeech({ kind: 'native', voice, text, culture, filterAction })

  audio.addEventListener('error', (e) => {
    toastStore.error(`Error playing web speech: ${e.message}`)
    responseStore.setState({ speaking: undefined })
  })

  audio.addEventListener('playing', () =>
    responseStore.setState({ speaking: { messageId, status: 'playing' } })
  )
  audio.addEventListener('ended', () => responseStore.setState({ speaking: undefined }))

  audio.play(voice.rate)
}

subscribe('voice-generating', { chatId: 'string', messageId: 'string' }, (body) => {
  const { activeChatId } = getStore('messages').getState()
  if (activeChatId != body.chatId) return
  const { user } = getStore('user').getState()
  if (user?.texttospeech?.enabled === false) return
  responseStore.setState({ speaking: { messageId: body.messageId, status: 'generating' } })
})

subscribe('voice-failed', { chatId: 'string', error: 'string' }, (body) => {
  const { activeChatId } = getStore('messages').getState()
  if (activeChatId != body.chatId) return
  responseStore.setState({ speaking: undefined })
  toastStore.error(body.error)
})

subscribe(
  'voice-generated',
  { chatId: 'string', messageId: 'string', url: 'string', rate: 'number?' },
  (body) => {
    const { speaking } = responseStore.getState()
    if (speaking?.messageId !== body.messageId) return
    playVoiceFromUrl(body.chatId, body.messageId, body.url, body.rate)
  }
)

events.on(EVENTS.setWaiting, (next) => {
  responseStore.setState({ waiting: next })
})
