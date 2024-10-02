import { clamp, neat } from '/common/util'
import { toJsonSchema } from '/common/prompt'
import { defaultPresets } from '/common/default-preset'
import { PayloadOpts } from './types'

const chat_template = neat`
{%- if messages[0]['role'] == 'system' -%}
    {%- set system_message = messages[0]['content'] -%}
    {%- set messages = messages[1:] -%}
{%- else -%}
    {% set system_message = '' -%}
{%- endif -%}

{{ bos_token + system_message }}
{%- for message in messages -%}
    {{ message['content'] + '\n' }}
{%- endfor -%}`

export function getLocalPayload(opts: PayloadOpts, stops: string[] = []) {
  const gen = opts.settings!
  const body = getBasePayload(opts, stops)

  if (body.dynamic_temperature) {
    body.dynatemp_low = (gen.temp ?? 1) - (gen.dynatemp_range ?? 0)
    body.dynatemp_high = (gen.temp ?? 1) + (gen.dynatemp_range ?? 0)
    body.dynatemp_exponent = gen.dynatemp_exponent
  }

  if (opts.kind === 'continue') {
    gen.tokenHealing = true
  }

  return body
}

function getBasePayload(opts: PayloadOpts, stops: string[] = []) {
  const gen = opts.settings!
  const prompt = opts.prompt

  const format = gen.thirdPartyFormat

  const json_schema = opts.jsonSchema ? toJsonSchema(opts.jsonSchema) : undefined

  if (!gen.temp) {
    gen.temp = 0.75
  }

  if (format === 'vllm') {
    const body: any = {
      n: 1,
      model: gen.thirdPartyModel,
      stream: opts.kind === 'summary' ? false : gen.streamResponse ?? true,
      temperature: gen.temp ?? 0.5,
      max_tokens: gen.maxTokens ?? 200,

      top_p: gen.topP ?? 1,
      min_p: gen.minP,
      top_k: gen.topK! < 1 ? -1 : gen.topK,

      stop: getStoppingStrings(opts, stops),
      ignore_eos: gen.banEosToken,

      repetition_penalty: gen.repetitionPenalty,
      presence_penalty: gen.presencePenalty ?? 0,
      frequency_penalty: gen.frequencyPenalty ?? 0,
    }

    if (opts.jsonSchema) {
      body.guided_json = json_schema
      body.guided_decoding_backend = 'outlines'
    }

    if (gen.topK && gen.topK < 1) {
      body.top_k = -1
    }

    if (gen.topP === 0) {
      body.top_p = -1
    }

    if (opts.imageData) {
      body.chat_template = chat_template
      body.messages = [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: opts.imageData } },
          ],
        },
      ]
    } else {
      body.prompt = prompt
    }

    return body
  }

  if (format === 'ollama') {
    const payload: any = {
      prompt,
      model: gen.thirdPartyModel,
      stream: !!gen.streamResponse,
      system: '',
      format: opts.jsonSchema ? 'json' : undefined,

      options: {
        seed: Math.trunc(Math.random() * 1_000_000_000),
        num_predict: gen.maxTokens,
        top_k: gen.topK,
        top_p: gen.topP,
        tfs_z: gen.tailFreeSampling,
        min_p: gen.minP,
        typical_p: gen.typicalP,
        repeat_last_n: gen.repetitionPenaltyRange,
        temperature: gen.temp,
        repeat_penalty: gen.repetitionPenalty,
        presence_penalty: gen.presencePenalty,
        frequency_penalty: gen.frequencyPenalty,
        mirostat: gen.mirostatToggle && gen.mirostatTau ? 2 : 0,
        mirostat_tau: gen.mirostatTau,
        mirostat_eta: gen.mirostatLR,
        stop: getStoppingStrings(opts, stops),

        // ignore_eos: false,
        dynatemp_range: gen.dynatemp_range,
        dynatemp_exponent: gen.dynatemp_exponent,
      },
    }

    if (opts.jsonSchema) {
      const schema = JSON.stringify(opts.jsonSchema, null, 2)
      payload.prompt += `\nRespond using the following JSON Schema:\n${schema}`
    }

    if (opts.imageData) {
      const comma = opts.imageData.indexOf(',')
      const base64 = opts.imageData.slice(comma + 1)
      payload.images = [base64]
    }

    return payload
  }

  if (format === 'mistral') {
    const body = {
      messages: [{ role: 'user', content: prompt }],
      model: gen.mistralModel!,
      temperature: clamp(gen.temp!, 0.01, 1),
      top_p: clamp(gen.topP!, 0, 1),
      max_tokens: gen.maxTokens!,
      stream: gen.streamResponse,
    }

    return body
  }

  if (format === 'tabby') {
    const body: any = {
      prompt,
      top_k: gen.topK,
      top_a: gen.topA,
      min_p: gen.minP,
      smoothing_factor: gen.smoothingFactor,
      tfs: gen.tailFreeSampling,
      typical: gen.typicalP,
      repetition_penalty: gen.repetitionPenalty,
      repetition_penalty_range: gen.repetitionPenaltyRange,
      mirostat_mode: gen.mirostatToggle ? 2 : 0,
      mirostat_tau: gen.mirostatTau,
      mirostat_eta: gen.mirostatLR,
      add_bos_token: gen.addBosToken,
      ban_eos_token: gen.banEosToken,
      cfg_scale: gen.cfgScale,
      negative_prompt: gen.cfgOppose,
      stop: getStoppingStrings(opts, stops),
      max_tokens: gen.maxTokens,
      frequency_penalty: gen.frequencyPenalty,
      presence_penalty: gen.presencePenalty,
      stream: gen.streamResponse,
      token_healing: gen.tokenHealing,
      temperature_last: gen.minP ? !!gen.tempLast : false,
      json_schema,
    }

    if (gen.dynatemp_range) {
      body.min_temp = (gen.temp ?? 1) - (gen.dynatemp_range ?? 0)
      body.max_temp = (gen.temp ?? 1) + (gen.dynatemp_range ?? 0)
      body.temp_exponent = gen.dynatemp_exponent
    }

    return body
  }

  if (format === 'llamacpp') {
    const body = {
      prompt,
      temperature: gen.temp,
      min_p: gen.minP,
      top_k: gen.topK,
      top_p: gen.topP,
      n_predict: gen.maxTokens,
      stop: getStoppingStrings(opts, stops),
      stream: true,
      frequency_penalty: gen.frequencyPenalty,
      presence_penalty: gen.presencePenalty,
      mirostat: gen.mirostatTau ? 2 : 0,
      mirostat_tau: gen.mirostatTau,
      mirostat_eta: gen.mirostatLR,
      seed: -1,
      typical_p: gen.typicalP,
      ignore_eos: gen.banEosToken,
      repeat_penalty: gen.repetitionPenalty,
      repeat_last_n: gen.repetitionPenaltyRange,
      tfs_z: gen.tailFreeSampling,
      json_schema,
    }
    return body
  }

  if (format === 'ooba') {
    const body: any = {
      prompt,
      temperature: gen.temp,
      min_p: gen.minP,
      top_k: gen.topK,
      top_p: gen.topP,
      top_a: gen.topA,
      stop: getStoppingStrings(opts, stops),
      stream: true,
      frequency_penalty: gen.frequencyPenalty,
      presence_penalty: gen.presencePenalty,
      repetition_penalty: gen.repetitionPenalty,
      repetition_penalty_range: gen.repetitionPenaltyRange,
      do_sample: gen.doSample,
      penalty_alpha: gen.penaltyAlpha,
      mirostat_mode: gen.mirostatTau ? 2 : 0,
      mirostat_tau: gen.mirostatTau,
      mirostat_eta: gen.mirostatLR,
      typical_p: gen.typicalP,
      tfs_z: gen.tailFreeSampling,
      max_tokens: gen.maxTokens,
      skip_special_tokens: gen.skipSpecialTokens,
      smoothing_factor: gen.smoothingFactor,
      smoothing_curve: gen.smoothingCurve,
      tfs: gen.tailFreeSampling,
    }

    if (gen.dynatemp_range) {
      body.dynamic_temperature = true
      body.dynatemp_low = (gen.temp ?? 1) - (gen.dynatemp_range ?? 0)
      body.dynatemp_high = (gen.temp ?? 1) + (gen.dynatemp_range ?? 0)
      body.dynatemp_exponent = gen.dynatemp_exponent
    }

    return body
  }

  if (format === 'aphrodite') {
    const body: any = {
      model: gen.thirdPartyModel || '',
      stream: opts.kind === 'summary' ? false : gen.streamResponse ?? true,
      temperature: gen.temp ?? 0.5,
      max_tokens: gen.maxTokens ?? 200,
      best_of: gen.swipesPerGeneration,
      n: gen.swipesPerGeneration,
      prompt,

      top_p: gen.topP ?? 1,
      min_p: gen.minP,
      top_k: gen.topK! < 1 ? -1 : gen.topK,
      top_a: gen.topA,
      stop: getStoppingStrings(opts, stops),
      smoothing_factor: gen.smoothingFactor,
      smoothing_curve: gen.smoothingCurve,

      mirostat_mode: gen.mirostatToggle ? 2 : 0,
      mirostat_tau: gen.mirostatTau,
      mirostat_eta: gen.mirostatLR,

      tfs: gen.tailFreeSampling,
      typical_p: gen.typicalP,

      repetition_penalty: gen.repetitionPenalty,
      presence_penalty: gen.presencePenalty ?? 0,
      frequency_penalty: gen.frequencyPenalty ?? 0,
      ignore_eos: gen.banEosToken,
      skip_special_tokens: gen.skipSpecialTokens,
      eta_cutoff: gen.etaCutoff,
      epsilon_cutoff: gen.epsilonCutoff,
    }

    if (gen.dynatemp_range) {
      body.dynatemp_min = (gen.temp ?? 1) - (gen.dynatemp_range ?? 0)
      body.dynatemp_max = (gen.temp ?? 1) + (gen.dynatemp_range ?? 0)
      body.dynatemp_exponent = gen.dynatemp_exponent
    }

    return body
  }

  if (format === 'exllamav2') {
    const body = {
      request_id: opts.requestId,
      action: 'infer',
      text: prompt,
      stream: true,
      temperature: gen.temp,
      top_k: gen.topK,
      top_p: gen.topP,
      max_new_tokens: gen.maxTokens,
      stop_conditions: getStoppingStrings(opts, stops),
      typical: gen.typicalP,
      rep_pen: gen.repetitionPenalty,
      freq_pen: gen.frequencyPenalty,
      pres_pen: gen.presencePenalty,
      min_p: gen.minP,
      token_healing: !!gen.tokenHealing,
    }
    return body
  }

  if (format === 'koboldcpp') {
    const body = {
      n: 1,
      max_context_length: gen.maxContextLength,
      prompt,
      max_length: gen.maxTokens,
      rep_pen: gen.repetitionPenalty,
      temperature: gen.temp,
      tfs: gen.tailFreeSampling,
      min_p: gen.minP,
      top_p: gen.topP,
      top_k: gen.topK,
      top_a: gen.topA,
      typical: gen.typicalP,
      stop_sequence: getStoppingStrings(opts, stops),
      dynatemp_range: gen.dynatemp_range,
      dynatemp_exponent: gen.dynatemp_exponent,
      smoothing_factor: gen.smoothingFactor,
      rep_pen_range: gen.repetitionPenaltyRange,
      rep_pen_slope: gen.repetitionPenaltySlope,
    }
    return body
  }

  if (format === 'openai' || format === 'openai-chat') {
    const oaiModel = gen.thirdPartyModel || gen.oaiModel || defaultPresets.openai.oaiModel
    const maxResponseLength = gen.maxTokens ?? defaultPresets.openai.maxTokens

    const body: any = {
      model: oaiModel,
      stream:
        (gen.streamResponse && opts.kind !== 'summary') ?? defaultPresets.openai.streamResponse,
      temperature: gen.temp ?? defaultPresets.openai.temp,
      max_tokens: maxResponseLength,
      top_p: gen.topP ?? 1,
      stop: getStoppingStrings(opts),
    }

    body.presence_penalty = gen.presencePenalty ?? defaultPresets.openai.presencePenalty
    body.frequency_penalty = gen.frequencyPenalty ?? defaultPresets.openai.frequencyPenalty

    return body
  }
}

function getStoppingStrings(opts: PayloadOpts, extras: string[] = []) {
  const seen = new Set<string>(extras)
  const unique = new Set<string>(extras)

  if (!opts.settings?.disableNameStops) {
    const chars = Object.values(opts.characters || {})
    if (opts.impersonate) {
      chars.push(opts.impersonate)
    }

    for (const char of chars) {
      if (seen.has(char.name)) continue
      if (char.name === opts.replyAs.name) continue
      unique.add(`\n${char.name}:`)
      seen.add(char.name)
    }

    for (const member of opts.members) {
      if (seen.has(member.handle)) continue
      if (member.handle === opts.replyAs.name) continue
      unique.add(`\n${member.handle}:`)
      seen.add(member.handle)
    }
  }

  if (opts.settings?.stopSequences && !Array.isArray(opts.settings.stopSequences)) {
    const values = Object.values(opts.settings.stopSequences) as string[]
    opts.settings.stopSequences = values
    for (const stop of values) {
      seen.add(stop)
      unique.add(stop)
    }
  } else if (opts.settings?.stopSequences) {
    opts.settings.stopSequences.forEach((seq) => {
      unique.add(seq)
    })
  }

  return Array.from(unique.values()).filter((str) => !!str)
}
