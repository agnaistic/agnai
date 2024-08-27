import { handleOAI } from './openai'
import { getLocalPayload } from './payloads'
import { PayloadOpts } from './types'
import { GenerateRequestV2 } from '/srv/adapter/type'
import { localApi } from '/web/store/data/storage'
import { localEmit } from '/web/store/socket'

export async function handleLocalRequest(body: GenerateRequestV2, prompt: string) {
  if (body.settings?.service !== 'kobold') {
    throw new Error(`Cannot run local request: Preset is not a third-party preset`)
  }

  const stream = startRequest(body, prompt)
  let response = ''

  for await (const gen of stream) {
    if (typeof gen === 'string') {
      response = gen
      break
    }

    if ('partial' in gen) {
      const prefix = body.kind === 'continue' ? `${body.continuing?.msg || ''} ` : ''
      localEmit({
        requestId: body.requestId,
        type: 'message-partial',
        kind: body.kind,
        partial: `${prefix}${gen.partial}`,
        adapter: 'local',
        chatId: body.chat._id,
      })
      continue
    }

    if ('error' in gen) {
      const message = typeof gen.error === 'string' ? gen.error : gen.error.message
      localEmit({
        type: 'message-error',
        requestId: body.requestId,
        error: gen.error,
        adapter: 'local',
        chatId: body.chat._id,
      })
      return localApi.error(message)
    }

    if ('warning' in gen) {
      // localEmit({ type: 'message-warning', requestId: body.requestId, warning: gen.warning })
    }
  }

  return localApi.result({ response, requestId: body.requestId })
}

function startRequest(request: GenerateRequestV2, prompt: string) {
  const opts: PayloadOpts = { ...request, prompt }
  const payload = getLocalPayload(opts)

  switch (request.settings!.thirdPartyFormat) {
    case 'openai':
    case 'openai-chat':
      return handleOAI(opts, payload)

    case 'aphrodite':
    case 'exllamav2':
    case 'llamacpp':
    case 'ooba':
    case 'tabby':
    case 'vllm':
    case 'ollama':
    case 'koboldcpp':
    case 'kobold':
    case 'mistral':
    case 'claude':
    default: {
      throw new Error('Local requests for this format are not yet supported')
    }
  }
}
