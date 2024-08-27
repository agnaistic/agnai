import { AdapterProps, ModelAdapter } from './type'
import { sanitise, sanitiseAndTrim, trimResponseV2 } from '/common/requests/util'
import { registerAdapter } from './register'
import { WebSocket } from 'ws'
import { eventGenerator } from '/common/util'
import { logger } from '../middleware'

type PetalRequest = {
  type: 'generate'
  inputs: string
  do_sample: number
  extra_stop_sequences?: string[]
  stop_sequence?: string
  temperature: number
  top_p?: number
  top_k?: number
  max_length?: number
  max_new_tokens?: number // 1 ?
  num_beams?: number // 1
}

export const handlePetals: ModelAdapter = async function* (opts) {
  const body: PetalRequest = {
    type: 'generate',
    inputs: opts.prompt,
    do_sample: 1,
    max_new_tokens: 1, // ?
    temperature: opts.gen.temp!,
    stop_sequence: '###',
    extra_stop_sequences: ['</s>'],
    // max_length: 2048,
    // top_k: opts.gen.topK,
    top_p: opts.gen.topP,
    num_beams: 1,
  }

  const url = opts.gen.registered?.petals?.url || opts.user.adapterConfig?.petals?.url
  if (!url) {
    yield { error: `Petals request failed: URL not set` }
    return
  }

  const model = opts.gen.registered?.petals?.model || opts.user.adapterConfig?.petals?.model
  if (!model) {
    yield { error: `Petals request failed: Model not set` }
    return
  }

  opts.log.debug({ ...body, prompt: null }, 'Petals payload')
  opts.log.debug(`Prompt:\n${body.inputs}`)
  yield { prompt: body.inputs }

  let accum = ''
  const resp = generateStream(url, model, opts, body)

  for await (const event of resp) {
    if (event.error) {
      yield event
      return
    }

    if (event.token) {
      accum += event.token
      yield {
        partial: sanitiseAndTrim(accum, opts.prompt, opts.replyAs, opts.characters, opts.members),
      }
    }
  }

  const parsed = sanitise(accum.replace(opts.prompt, ''))
  const trimmed = trimResponseV2(parsed, opts.replyAs, opts.members, opts.characters, [
    'END_OF_DIALOG',
  ])
  yield trimmed || parsed
}

function generateStream(url: string, model: string, opts: AdapterProps, body: PetalRequest) {
  url = url.toLocaleLowerCase().replace('https:', 'wss:').replace('http:', 'ws:')
  if (!url.startsWith('ws')) {
    url = `ws://${url}`
  }

  const emitter = eventGenerator()
  const socket = new WebSocket(`${url}/api/v2/generate`)
  let init = false
  let accum = ''

  const endTokens: string[] = []
  for (const char of Object.values(opts.characters || {})) {
    if (char.name === opts.replyAs.name) continue
    endTokens.push(`${char.name}:`)
  }

  socket.on('open', () => {
    socket.send(
      JSON.stringify({
        type: 'open_inference_session',
        model,
        max_length: opts.gen.maxContextLength,
      })
    )
  })

  socket.on('message', (data) => {
    const msg = JSON.parse(data.toString()) as any

    if (!init && msg.ok) {
      init = true

      socket.send(JSON.stringify(body))
      return
    }

    if (msg.outputs) {
      accum += msg.outputs
      emitter.push({ token: msg.outputs })
    }

    if (msg.stop) {
      socket.close()
      emitter.done()
      return
    }

    for (const endToken of endTokens) {
      if (accum.includes(endToken)) {
        socket.close()
        emitter.done()
        return
      }
    }
  })

  socket.on('error', (err) => {
    logger.error({ err }, 'Petals error')
  })

  socket.on('close', () => {
    emitter.done()
  })

  return emitter.stream
}

registerAdapter('petals', handlePetals, {
  label: 'Petals',
  settings: [
    {
      field: 'url',
      label: 'Petals Chat URL',
      secret: false,
      setting: { type: 'text', placeholder: 'E.g. http://localhost:5000' },
      preset: true,
    },
    {
      field: 'model',
      label: 'Model',
      secret: false,
      setting: { type: 'text', placeholder: 'E.g. meta-llama/Llama-2-13b-chat-hf' },
      preset: true,
    },
  ],
  options: [
    'temp',
    'gaslight',
    'topA',
    'topP',
    'ultimeJailbreak',
    'gaslight',
    'ignoreCharacterSystemPrompt',
  ],
})
