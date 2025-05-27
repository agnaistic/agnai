import needle from 'needle'
import { streamGenerator } from './stream'
import { PayloadOpts } from './types'
import { toChatCompletionPayload } from '/srv/adapter/chat-completion'
import { joinUrl, sanitiseAndTrim } from './util'
import { countTokens } from '../tokenize'
import { validateChatMessagesWithImage } from '/srv/adapter/template-chat-payload'
import { toImageJinjaTemplate } from './payloads'

type Role = 'user' | 'assistant' | 'system'
export type CompletionItem = { role: Role; content: string; name?: string }

type CompletionContent<T> = Array<{ finish_reason: string; index: number } & ({ text: string } | T)>
type Inference = { message: { content: string; role: Role } }
export type AsyncDelta = { delta: Partial<Inference['message']> }

type Completion<T = Inference> = {
  id: string
  created: number
  model: string
  object: string
  choices: CompletionContent<T>
  error?: { message: string }
}

export async function* handleOAI(opts: PayloadOpts, signal: AbortController, payload: any) {
  const gen = opts.settings!
  const options = { ...opts, gen }

  const messages = await toChatCompletionPayload(
    options as any,
    countTokens,
    opts.settings?.maxTokens!
  )

  if (opts.imageData && gen.jinjaEnabled) {
    payload.chat_template = toImageJinjaTemplate({
      format: gen.modelFormat,
      jinja: gen.jinjaTemplate,
    })
  }

  const headers: any = {
    'Content-Type': 'application/json',
  }

  if (gen.userThirdPartyKey) {
    headers.Authorization = `Bearer ${gen.userThirdPartyKey}`
    headers['x-api-key'] = `${gen.userThirdPartyKey}`
  }

  const urlPath = gen.thirdPartyFormat === 'openai' ? `/completions` : `/chat/completions`

  // await validateModel(gen.thirdPartyUrl || '', payload, headers)

  if (gen.thirdPartyFormat === 'openai') {
    payload.prompt = opts.prompt
    console.log(`Prompt:${opts.prompt}`)
  } else {
    payload.messages = messages
    console.log(`Prompt:\n`, JSON.stringify(messages, null, 2))
  }

  payload.messages = validateChatMessagesWithImage(opts, messages)
  const fullUrl = joinUrl(gen.thirdPartyUrl || '', urlPath)

  if (!gen.streamResponse) {
    const result = await requestFullCompletion(fullUrl, headers, payload, signal)
    if ('error' in result) {
      yield result
      return
    }

    const text = getCompletionContent(result)
    if (text instanceof Error) {
      yield { error: `request returned an error: ${text.message}` }
      return
    }

    if (!text?.length) {
      yield { error: `[local] request failed: Received empty response. Try again.` }
      return
    }

    yield sanitiseAndTrim(text, opts.prompt, opts.replyAs, opts.characters, opts.members)
    return
  }

  const stream = streamGenerator({
    userId: opts.user._id,
    body: payload,
    headers,
    service: 'kobold',
    signal,
    url: fullUrl,
    log: undefined,
    format: gen.thirdPartyFormat,
  })

  let accumulated = ''
  let response: Completion<Inference> | undefined

  while (true) {
    let generated = await stream.next()

    // Both the streaming and non-streaming generators return a full completion and yield errors.
    if (generated.done) {
      response = generated.value
      break
    }

    if (generated.value.error) {
      yield { error: generated.value.error }
      return
    }

    // Only the streaming generator yields individual tokens.
    if ('token' in generated.value) {
      accumulated += generated.value.token
      yield {
        partial: sanitiseAndTrim(
          accumulated,
          opts.prompt,
          opts.char,
          opts.characters,
          opts.members
        ),
      }
    }

    if ('gens' in generated.value) {
      yield { gens: generated.value.gens }
    }

    if ('tokens' in generated.value && generated.value.tokens) {
      yield { tokens: generated.value.tokens }
      accumulated = generated.value.tokens
    }

    if ('meta' in generated.value) {
      yield { meta: generated.value.meta }
    }

    if ('error' in generated.value) {
      yield { error: generated.value.error }
      return
    }
  }

  if (!accumulated) {
    try {
      let text = getCompletionContent(response)
      if (text instanceof Error) {
        yield { error: `Request returned an error: ${text.message}` }
        return
      }

      if (!text?.length) {
        yield { error: `[local] Received empty response. Try again.` }
        return
      }

      accumulated = text
    } catch (ex: any) {
      yield { error: `Request failed: ${ex.message}` }
      return
    }
  }

  yield sanitiseAndTrim(accumulated, opts.prompt, opts.replyAs, opts.characters, opts.members)
}

export async function requestFullCompletion(
  url: string,
  headers: any,
  body: any,
  signal: AbortController
) {
  try {
    const resp = await needle('post', url, JSON.stringify(body), {
      json: true,
      signal: signal.signal,
      response_timeout: 0,
      read_timeout: 0,
      open_timeout: 90000,
      headers,
    }).catch((err) => ({ error: err }))

    if ('error' in resp) {
      return { error: `Local request failed: ${resp.error?.message || resp.error}` }
    }

    if (resp.statusCode && resp.statusCode >= 400) {
      const msg =
        resp.body?.error?.message || resp.body.message || resp.statusMessage || 'Unknown error'

      return { error: `Local request failed (${resp.statusCode}): ${msg}` }
    }

    return resp.body
  } catch (ex: any) {
    return { error: ex?.message || ex }
  }
}

function getCompletionContent(completion: Completion<Inference> | undefined) {
  if (!completion) {
    return ''
  }

  if (completion.error?.message) {
    return new Error(completion.error.message)
  }

  const choice = completion?.choices?.[0] || {}

  if ('text' in choice) {
    return choice.text
  } else {
    return choice.message?.content
  }
}

// async function validateModel(baseURL: string, payload: any, headers: any) {
//   const res = await needle('get', joinUrl(baseURL, '/models'), {
//     headers,
//     json: true,
//   }).catch(() => null)

//   if (!res) return

//   const code = res.statusCode ?? 400
//   if (code >= 400) {
//     return
//   }

//   if (!Array.isArray(res.body.data)) return
//   const names = res.body.data.map((data: any) => data.id) as string[]

//   if (!payload.model || !names.includes(payload.model)) {
//     payload.model = names[0]
//   }
// }
