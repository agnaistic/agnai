import { decryptText } from '../db/util'
import { getEncoderByName } from '../tokenize'
import { toChatCompletionPayload } from './chat-completion'
import { getStoppingStrings } from './prompt'
import { ModelAdapter } from './type'
import { sanitise, sanitiseAndTrim, trimResponseV2 } from '/common/requests/util'
import {
  Content,
  GenerateContentConfig,
  GoogleGenAI,
  HarmBlockThreshold,
  HarmCategory,
  SafetySetting,
} from '@google/genai'
import { stripImageContent } from './template-chat-payload'

const SYSTEM_INCAPABLE: Record<string, boolean> = {
  'gemini-1.0-pro-latest': true,
}

export const handleGemini: ModelAdapter = async function* (opts) {
  const key = opts.guest ? opts.gen.thirdPartyKey : decryptText(opts.gen.thirdPartyKey!)

  const encoder = getEncoderByName('gemma')
  const messages =
    opts.messages || (await toChatCompletionPayload(opts, encoder.count, opts.gen.maxTokens!))

  if (!opts.gen.googleModel) {
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
    stopSequences: getStoppingStrings(opts),
    presencePenalty: opts.gen.presencePenalty,
    frequencyPenalty: opts.gen.frequencyPenalty,
    abortSignal: opts.signal.signal,
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
  } else {
    generationConfig.thinkingConfig = {
      thinkingBudget: 0,
      includeThoughts: false,
    }
  }

  const systems = opts.messages?.find((m) => m.role === 'system')
  const contents: Content[] = []

  const canUseSystemInstruct = !SYSTEM_INCAPABLE[opts.gen.googleModel]

  for (const msg of messages) {
    if (msg.role === 'system') {
      continue
    }

    contents.push({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.content }] })
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

  if (opts.imageData) {
    let added = false
    for (let i = contents.length - 1; i >= 0; i--) {
      const msg = contents[i]

      if (msg.role !== 'user') continue

      const { mimeType, data } = getMimeTypeBase64(opts.imageData)

      msg.parts!.push({
        inlineData: {
          mimeType: mimeType,
          data,
        },
      })
      added = true
      break
    }

    if (!added) {
      const { mimeType, data } = getMimeTypeBase64(opts.imageData)
      contents.push({
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data,
            },
          },
        ],
      })
    }
  }

  const client = new GoogleGenAI({ apiKey: key! })
  let accum = ''

  yield {
    prompt: [
      {
        role: 'system',
        parts: (generationConfig.systemInstruction as Content)?.parts,
      },
    ].concat(...stripImageContent(contents)),
  }

  if (!opts.gen.streamResponse) {
    const ai = await client.models
      .generateContent({
        model: opts.gen.googleModel!,
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

    const text = ai.candidates?.[0].content?.parts?.[0]?.text || ai.text || ''
    accum += text
  } else {
    const ai = await client.models
      .generateContentStream({
        model: opts.gen.googleModel!,
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

      const text = tick.candidates?.[0].content?.parts?.[0]?.text || tick.text
      accum += text || ''
      yield { partial: sanitiseAndTrim(accum, '', opts.replyAs, opts.characters, opts.members) }
    }
  }

  const parsed = sanitise(accum)
  const trimmed = trimResponseV2(
    parsed,
    opts.replyAs,
    opts.members,
    opts.characters,
    generationConfig.stopSequences
  )

  yield trimmed || parsed
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

function getMimeTypeBase64(base64: string) {
  const [start, encode] = base64.split(';')
  if (!start.startsWith('data:')) return { mimeType: 'image/jpeg', data: base64 }

  return { mimeType: start.slice(5), data: encode.replace('base64,', '') }
}
