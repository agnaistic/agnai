import { decryptText } from '../db/util'
import { ModelAdapter } from './type'
import { sanitise } from '/common/requests/util'
import {
  Content,
  GenerateContentConfig,
  GoogleGenAI,
  HarmBlockThreshold,
  HarmCategory,
  SafetySetting,
} from '@google/genai'
import { remapMessages } from './template-chat-payload'
import { getMimeTypeBase64 } from '/common/util'
import { getEncoderByName } from '../tokenize'
import { getJsonSchemaPayload } from '/common/guidance/json-schema'
import { getStoppingStrings } from '/common/requests/payloads'
import { toChatMessages } from '/common/template-messages'
import { LLM_DEBUG } from './util'

const SYSTEM_INCAPABLE: Record<string, boolean> = {
  'gemini-1.0-pro-latest': true,
}

export const handleGemini: ModelAdapter = async function* (opts) {
  const key = opts.guest ? opts.gen.thirdPartyKey : decryptText(opts.gen.thirdPartyKey!)

  const counter = getEncoderByName('gemma')
  let messages = opts.messages
  if (!messages) {
    const res = await toChatMessages(opts, counter.count)
    messages = res.messages
  }

  const googleModel = opts.gen.thirdPartyModel || opts.gen.googleModel

  if (!googleModel) {
    yield { error: 'Google AI Studio Model not set: Check your preset' }
    return
  }

  const generationConfig: GenerateContentConfig = {
    safetySettings,
    candidateCount: 1,
    temperature: opts.gen.temp,
    maxOutputTokens: opts.gen.maxTokens,
    topP: opts.gen.topP,
    topK: opts.gen.topK,
    stopSequences: getStoppingStrings(opts, opts.gen),
    presencePenalty: opts.gen.presencePenalty,
    frequencyPenalty: opts.gen.frequencyPenalty,
    abortSignal: opts.signal.signal,
    responseSchema: opts.jsonSchema
      ? getJsonSchemaPayload(opts.jsonSchema, 'gemini', opts)
      : undefined,
  }

  if (opts.gen.reasoning?.enabled) {
    const effort = opts.gen.reasoning.effort || 'low'
    const max = Math.max(opts.gen.maxTokens ?? 2048, 2048)
    generationConfig.maxOutputTokens = max

    let tokens = 0
    switch (effort) {
      case 'custom': {
        tokens = opts.gen.reasoning.maxTokens ?? 0
        break
      }

      case 'high': {
        tokens = max * 0.8
        break
      }

      case 'medium': {
        tokens = max * 0.5
        break
      }

      case 'low':
      default: {
        tokens = max * 0.2
        break
      }
    }

    generationConfig.thinkingConfig = {
      thinkingBudget: Math.floor(tokens),
      includeThoughts: !opts.gen.reasoning.exclude,
    }
  }

  const systems = opts.messages?.find((m) => m.role === 'system')
  const contents: Content[] = []

  const canUseSystemInstruct = !SYSTEM_INCAPABLE[googleModel]

  remapMessages(messages, {
    text: (text) => ({ text }),
    image: (data) => ({ inlineData: getMimeTypeBase64(data) }),
  })

  for (const msg of messages) {
    if (msg.role === 'system') {
      continue
    }

    if (msg.role === 'user') {
      if (Array.isArray(msg.content)) {
        contents.push({ role: 'user', parts: msg.content })
        continue
      }

      contents.push({ role: 'user', parts: [{ text: msg.content }] })
      continue
    }

    contents.push({ role: 'model', parts: [{ text: msg.content }] })

    continue
  }

  if (systems) {
    if (canUseSystemInstruct) {
      generationConfig.systemInstruction = {
        parts: [{ text: systems.content }],
      }
    } else {
      contents.unshift({ role: 'user', parts: [{ text: systems.content }] })
    }
  }

  const client = new GoogleGenAI({ apiKey: key! })
  let thoughts = ''
  let accum = ''

  const finder = (part: any) => !!part.text
  const stripped = contents.map((content) => {
    if (!content.parts || content.parts.length < 2) return content
    const text = content.parts.find(finder)
    return {
      ...content,
      parts: [text, { type: 'image_url', image_url: `[REDACTED:${content.parts.length - 1}]` }],
    }
  })

  yield {
    prompt: [
      {
        role: 'system',
        parts: (generationConfig.systemInstruction as Content)?.parts,
      },
    ].concat(...(stripped as any[])),
  }

  if (!opts.gen.streamResponse) {
    const ai = await client.models
      .generateContent({
        model: googleModel!,
        contents,
        config: generationConfig,
      })
      .catch((err) => ({ err }))

    if ('err' in ai) {
      const error = ai.err.error?.message || ai.err?.message
      yield { error: `[GoogleAI] response failed: ${error || 'unexpected error'}` }
      return
    }

    const blocked = ai.promptFeedback?.blockReasonMessage || ai.promptFeedback?.blockReason
    if (blocked) {
      yield { error: `[GoogleAI] Prompt was blocked: ${blocked}` }
      return
    }

    const choice = ai.candidates?.[0]
    const meta = { stop: choice?.finishReason, model: googleModel }
    const text = choice?.content?.parts?.[0]?.text || ai.text || ''
    yield { meta }

    accum += text
  } else {
    const ai = await client.models
      .generateContentStream({
        model: googleModel,
        config: generationConfig,
        contents,
      })
      .catch((err) => ({ err }))

    if ('err' in ai) {
      const error = ai.err.error?.message || ai.err?.message
      yield { error: `[GoogleAI] response failed: ${error || 'unexpected error'}` }
      return
    }

    for await (const tick of ai) {
      const blocked = tick.promptFeedback?.blockReasonMessage || tick.promptFeedback?.blockReason
      if (blocked) {
        yield { error: `[GoogleAI] Prompt was blocked: ${blocked}` }
        return
      }

      const choice = tick.candidates?.[0]
      const candidate = choice?.content?.parts?.[0] || {}

      if (choice?.finishReason) {
        yield { meta: { stop: choice.finishReason, model: googleModel } }
      }

      const thought = candidate.thought as boolean
      const text = candidate.text || tick.text

      if (!text) continue

      if (LLM_DEBUG) {
        console.log([`[g:chunk] ${JSON.stringify(tick)}`])
      }

      if (thought) {
        thoughts += text
        yield { thoughts: text }
      } else {
        accum += text || ''
        yield { partial: accum }
      }
    }
  }

  const parsed = sanitise(accum)
  yield parsed
}

const safetySettings: SafetySetting[] = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
]
