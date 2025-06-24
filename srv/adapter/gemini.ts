import { decryptText } from '../db/util'
import { getStoppingStrings } from './prompt'
import { ModelAdapter } from './type'
import { sanitise, sanitiseAndTrim, trimResponseV2 } from '/common/requests/util'
import {
  Content,
  GenerateContentConfig,
  GoogleGenAI,
  HarmBlockThreshold,
  HarmCategory,
  Part,
  SafetySetting,
} from '@google/genai'
import { remapMessages, stripImageContent, toChatMessages } from './template-chat-payload'
import { getMimeTypeBase64 } from '/common/util'
import { getEncoderByName } from '../tokenize'
import { getJsonSchemaPayload } from '/common/guidance/json-schema'

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

  remapMessages(messages, {
    text: (text) => ({ text }),
    image: (data) => ({ inlineData: { mimeType: getMimeTypeBase64(data), data } }),
  })

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
    stopSequences: getStoppingStrings(opts),
    presencePenalty: opts.gen.presencePenalty,
    frequencyPenalty: opts.gen.frequencyPenalty,
    abortSignal: opts.signal.signal,
    responseSchema:
      opts.gen.jsonEnabled && opts.jsonSchema
        ? getJsonSchemaPayload(opts.jsonSchema, 'gemini', opts)
        : undefined,
  }

  if (opts.gen.reasoning?.enabled) {
    const effort = opts.gen.reasoning.effort || 'low'
    const max = Math.max(opts.gen.maxTokens ?? 2048, 2048)

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

  const contents: Content[] = []

  const systems = opts.messages?.find((m) => m.role === 'system')
  const canUseSystemInstruct = !SYSTEM_INCAPABLE[googleModel]

  let systemIsUsed = false
  if (systems) {
    if (canUseSystemInstruct) {
      generationConfig.systemInstruction = {
        parts: [{ text: systems.content }],
      }
      systemIsUsed = true
    }
  }

  let hack = false
  for (const msg of messages) {
    // If we didnt set a system instruction, we use the first user message for the prompt
    if (msg.role === 'system' && !systemIsUsed) {
      contents.push({ role: 'user', parts: [{ text: msg.content }] })
      hack = true
      continue
    }

    // WTF! Please send help to my brain
    if (hack) {
      if (
        contents[0] &&
        Array.isArray(contents[0].parts) &&
        contents[0].parts[0] &&
        typeof contents[0].parts[0].text === 'string'
      ) {
        // if we are here this means, we have to put the SysPrompt and rest of the Prompt in one user message.
        contents[0].parts[0].text += '\n\n' + msg.content
        continue
      }
    }

    if (msg.role === 'user') {
      contents.push({ role: 'user', parts: [{ text: msg.content }] })
      continue
    }

    if (msg.role === 'assistant') {
      contents.push({ role: 'model', parts: [{ text: msg.content }] })
      continue
    }
    continue
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

    let str_thinking = ''
    let str_text = ''
    let firstThought = true

    /* Fun times with gemini responses.
    gemini API most of the time returns a response with two parts.
    The first part is the reasoning, the second part is the actual response.
    BUT! it sometimes likes to throw a curveball and return multiple parts.
    lets make sure we handle any amount of parts corectly.*/

    for (const part of (ai.candidates?.[0]?.content?.parts as Part[]) || []) {
      // If reasoning is expected we treat the first part as <think>.
      if (firstThought && !opts.gen.reasoning?.exclude) {
        str_thinking += part.text || ''
        firstThought = false
        continue
      }
      // In case of large responses, we can have multiple parts with thought=true.
      if (part.thought) {
        str_thinking += part.text || ''
        continue
      }
      str_text += part.text || ''
    }

    // Packing the response into the accumulator.
    if (
      (!opts.gen.reasoning?.exclude || false) &&
      (ai.candidates?.[0]?.content?.parts?.length ?? 0) >= 2
    ) {
      accum += opts.gen.prefill || '' // TODO: get a version of prefill after the Placeholder is replaced
      accum += str_thinking
      accum += opts.gen.reasoning?.end || '</think>'
      accum += '\n'
      accum += str_text
    } else {
      accum = str_text + str_thinking
    }
  } else {
    /*Rant_Mode: true
    I spent like 12 hours only on this fricking issue, its fricking stoopid.
    Using a Prefill with streaming is a nightmare, the part.thought will not be set to true
    @sceuick we might want to disable Prefills for streaming on Gemini. Or somehow tell them not to use it.
    otherwise they will complain why the fricking thoughts in their responses.
    Rant_Mode: false

    TLDR; Dont mix Prefills with streamingContent on Gemini.
    */
    const ai = await client.models
      .generateContentStream({
        model: googleModel,
        contents,
        config: generationConfig,
      })
      .catch((err) => ({ err }))

    if ('err' in ai) {
      const error = ai.err.error?.message || ai.err?.message
      yield { error: `[GoogleAI] response failed: ${error || 'unexpected error'}` }
      return
    }

    let wasThinking = false
    for await (const tick of ai) {
      const blocked = tick.promptFeedback?.blockReasonMessage || tick.promptFeedback?.blockReason
      if (blocked) {
        yield { error: `[GoogleAI] Prompt was blocked: ${blocked}` }
        return
      }
      const parts = (tick.candidates && tick.candidates?.[0]?.content?.parts) || []
      for (const part of parts) {
        if (!part.text) continue

        if (part.thought) {
          if (!accum) {
            accum += opts.gen.prefill + '\n' || '' // TODO: get a version of prefill after the Placeholder is replaced
            wasThinking = true
          }
          accum += part.text

          yield {
            partial: sanitiseAndTrim(accum, '', opts.replyAs, opts.characters, opts.members),
          }
        } else {
          if (wasThinking) {
            accum += (opts.gen?.reasoning?.end || '</think>') + '\n'
            wasThinking = false
          }
          accum += part.text
          yield {
            partial: sanitiseAndTrim(accum, '', opts.replyAs, opts.characters, opts.members),
          }
        }
      }
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
