import { AdapterProps } from './type'
import { getStoppingStrings } from './prompt'
import { clamp, neat } from '/common/util'
import { JsonSchema, toJsonSchema } from '/common/prompt'
import { defaultPresets } from '/common/default-preset'
import { getEncoderByName } from '../tokenize'
import { decryptText } from '../db/util'

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

export function getThirdPartyPayload(opts: AdapterProps, stops: string[] = []) {
  const { gen } = opts
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

function getBasePayload(opts: AdapterProps, stops: string[] = []) {
  const { gen, prompt, subscription } = opts

  const service = subscription?.preset?.service || gen.service
  const format = subscription?.preset?.thirdPartyFormat || gen.thirdPartyFormat

  const json_schema = opts.jsonSchema ? toJsonSchema(opts.jsonSchema) : undefined

  const characterNames = Object.values(opts.characters || {})
    .map((c) => c.name.split(' '))
    .concat(opts.members.map((m) => m.handle.split(' ')))
    .flat()

  const sequenceBreakers = Array.from(
    new Set(
      [opts.char.name?.split(' '), opts.replyAs.name?.split(' '), ...characterNames].flat()
    ).values()
  )
    .concat(gen.drySequenceBreakers || [])
    .flat()
    .filter((t) => !!t)

  if (!gen.temp) {
    gen.temp = 0.75
  }

  // Agnaistic
  if (service !== 'kobold') {
    if (!opts.contextSize) {
      const encoder = getEncoderByName(opts.subscription?.preset?.tokenizer as any)
      const context = encoder?.count(prompt)

      if (context) {
        opts.contextSize = context
      }
    }

    const body: any = {
      prompt,
      context_limit: gen.maxContextLength,
      max_new_tokens: gen.maxTokens,
      do_sample: gen.doSample ?? true,
      temperature: Math.min(gen.temp, 10),
      top_p: gen.topP,
      typical_p: gen.typicalP || 1,
      repetition_penalty: gen.repetitionPenalty,
      encoder_repetition_penalty: gen.encoderRepitionPenalty,
      repetition_penalty_range: gen.repetitionPenaltyRange,
      frequency_penalty: gen.frequencyPenalty,
      presence_penalty: gen.presencePenalty,
      top_k: gen.topK,
      min_p: gen.minP,
      top_a: gen.topA,
      min_length: 0,
      no_repeat_ngram_size: 0,
      num_beams: gen.numBeams || 1,
      penalty_alpha: gen.penaltyAlpha,
      length_penalty: 1,
      early_stopping: gen.earlyStopping || false,
      seed: -1,
      add_bos_token: gen.addBosToken || false,
      truncation_length: gen.maxContextLength || 2048,
      ban_eos_token: gen.banEosToken || false,
      skip_special_tokens: gen.skipSpecialTokens ?? true,
      stopping_strings: getStoppingStrings(opts, stops),
      dynamic_temperature: gen.dynatemp_range ? true : false,
      smoothing_curve: gen.smoothingCurve,
      smoothing_factor: gen.smoothingFactor,
      token_healing: gen.tokenHealing,
      temp_last: gen.tempLast,
      tfs: gen.tailFreeSampling,
      mirostat_mode: gen.mirostatTau ? 2 : 0,
      mirostat_tau: gen.mirostatTau,
      mirostat_eta: gen.mirostatLR,
      guidance: opts.guidance,
      placeholders: opts.placeholders,
      lists: opts.lists,
      previous: opts.previous,
      json_schema_v2: ensureSafeSchema(json_schema),
      reschema_prompt: opts.reschemaPrompt,
      json_schema,
      imageData: opts.imageData,
      context_size: opts.contextSize,
      xtc_threshold: gen.xtcThreshold,
      xtc_probability: gen.xtcProbability,

      dry_multiplier: gen.dryMultiplier,
      dry_base: gen.dryBase,
      dry_allowed_length: gen.dryAllowedLength,
      dry_range: gen.dryRange,
      dry_sequence_breakers: sequenceBreakers,
    }

    if (gen.dynatemp_range) {
      if (gen.dynatemp_range >= gen.temp) {
        gen.dynatemp_range = gen.temp - 0.1
      }

      body.min_temp = (gen.temp ?? 1) - (gen.dynatemp_range ?? 0)
      body.max_temp = (gen.temp ?? 1) + (gen.dynatemp_range ?? 0)
      body.dynatemp_range = gen.dynatemp_range
      body.temp_exponent = gen.dynatemp_exponent
    }

    if (subscription?.preset?.subApiKey) {
      body.api_key = decryptText(subscription.preset.subApiKey)
    }

    return body
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

  if (format === 'featherless') {
    const payload: any = {
      model: gen.featherlessModel,
      prompt,
      stop: getStoppingStrings(opts, stops),
      presence_penalty: gen.presencePenalty,
      frequency_penalty: gen.frequencyPenalty,
      repetition_penalty: gen.repetitionPenalty,
      temperature: gen.temp,
      top_p: gen.topP,
      top_k: gen.topK,
      min_p: gen.minP,
      max_tokens: gen.maxTokens,
      include_stop_str_in_output: false,
      stream: gen.streamResponse,
    }

    return payload
  }

  if (format === 'arli') {
    const body: any = {
      model: gen.arliModel,
      prompt,
      stop: getStoppingStrings(opts, stops),
      presence_penalty: gen.presencePenalty,
      frequency_penalty: gen.frequencyPenalty,
      length_penalty: gen.repetitionPenalty,
      tfs: gen.tailFreeSampling,
      temperature: gen.temp,
      top_p: gen.topP,
      top_k: gen.topK,
      min_p: gen.minP,
      typical_p: gen.typicalP,
      ignore_eos: false,
      max_tokens: gen.maxTokens,
      smoothing_factor: gen.smoothingFactor,
      smoothing_curve: gen.smoothingCurve,

      stream: gen.streamResponse,
    }

    if (gen.dryMultiplier) {
      body.dry_multiplier = gen.dryMultiplier
      body.dry_base = gen.dryBase
      body.dry_allowed_length = gen.dryAllowedLength
      body.dry_range = gen.dryRange
      body.dry_sequence_breakers = sequenceBreakers
    }

    if (gen.dynatemp_range) {
      body.dynamic_temperature = true
      body.dynatemp_min = (gen.temp ?? 1) - (gen.dynatemp_range ?? 0)
      body.dynatemp_max = (gen.temp ?? 1) + (gen.dynatemp_range ?? 0)
      body.dynatemp_exponent = gen.dynatemp_exponent
    }

    if (gen.xtcThreshold) {
      body.xtc_threshold = gen.xtcThreshold
      body.xtc_probability = gen.xtcProbability
    }

    if (body.top_k <= 0) {
      body.top_k = -1
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
      max_tokens: opts.gen.maxTokens,
      frequency_penalty: gen.frequencyPenalty,
      presence_penalty: gen.presencePenalty,
      stream: gen.streamResponse,
      token_healing: gen.tokenHealing,
      temperature_last: gen.minP ? !!gen.tempLast : false,
      xtc_threshold: gen.xtcThreshold,
      xtc_probability: gen.xtcProbability,

      dry_multiplier: gen.dryMultiplier,
      dry_base: gen.dryBase,
      dry_allowed_length: gen.dryAllowedLength,
      dry_range: gen.dryRange,
      dry_sequence_breakers: sequenceBreakers,
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
      max_tokens: opts.gen.maxTokens,
      skip_special_tokens: gen.skipSpecialTokens,
      smoothing_factor: gen.smoothingFactor,
      smoothing_curve: gen.smoothingCurve,
      tfs: gen.tailFreeSampling,
      xtc_threshold: gen.xtcThreshold,
      xtc_probability: gen.xtcProbability,

      dry_multiplier: gen.dryMultiplier,
      dry_base: gen.dryBase,
      dry_allowed_length: gen.dryAllowedLength,
      dry_range: gen.dryRange,
      dry_sequence_breakers: sequenceBreakers,
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

    if (gen.dryMultiplier) {
      body.dry_multiplier = gen.dryMultiplier
      body.dry_base = gen.dryBase
      body.dry_allowed_length = gen.dryAllowedLength
      body.dry_range = gen.dryRange
      body.dry_sequence_breakers = sequenceBreakers
    }

    if (gen.dynatemp_range) {
      body.dynamic_temperature = true
      body.dynatemp_min = (gen.temp ?? 1) - (gen.dynatemp_range ?? 0)
      body.dynatemp_max = (gen.temp ?? 1) + (gen.dynatemp_range ?? 0)
      body.dynatemp_exponent = gen.dynatemp_exponent
    }

    if (gen.xtcThreshold) {
      body.xtc_threshold = gen.xtcThreshold
      body.xtc_probability = gen.xtcProbability
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

  if (format === 'openai') {
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

function ensureSafeSchema(schema: JsonSchema | undefined) {
  if (!schema) return

  const required = schema.required.filter((r) => r !== 'response')
  const properties = { ...schema.properties }
  delete properties.response

  return {
    ...schema,
    required,
    properties,
  }
}
