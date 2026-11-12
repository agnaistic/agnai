import { AdapterProps } from './type'
import { JsonSchema, toJsonSchema } from '/common/prompt'
import { getEncoderByName } from '../tokenize'
import { decryptText } from '../db/util'
import {
  getStoppingStrings,
  getThirdPartyPayload,
  toImageJinjaTemplate,
} from '/common/requests/payloads'
import { getJsonSchemaPayload } from '/common/guidance/json-schema'

export function getServicePayload(opts: AdapterProps, stops: string[] = []) {
  const { gen } = opts
  const body = getBasePayload(opts, stops)

  if (body.dynamic_temperature) {
    body.dynatemp_low = (gen.temp ?? 1) - (gen.dynatemp_range ?? 0)
    body.dynatemp_high = (gen.temp ?? 1) + (gen.dynatemp_range ?? 0)
    body.dynatemp_exponent = gen.dynatemp_exponent
  }

  if (gen.reasoning?.enabled) {
    body.reasoning = {
      enabled: true,
      exclude: gen.reasoning.exclude ?? false,
    }

    if (gen.reasoning.effort === 'custom') {
      body.reasoning.max_tokens = gen.reasoning.maxTokens ?? 0
    } else {
      body.reasoning.effort = gen.reasoning.effort ?? 'low'
    }
  }

  if (opts.kind === 'continue') {
    gen.tokenHealing = true
  }

  if (gen.jinjaEnabled) {
    body.chat_template = toImageJinjaTemplate({ format: gen.modelFormat, jinja: gen.jinjaTemplate })
  }

  if (gen.addBosToken) {
    body.add_bos_token = gen.addBosToken
  }

  return body
}

function getBasePayload(opts: AdapterProps, stops: string[] = []) {
  const { gen, prompt, subscription } = opts

  const service = subscription?.preset?.service || opts.conn.service

  if (service !== 'agnaistic') {
    const payload = getThirdPartyPayload(opts, stops)
    return payload
  }

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

  if (!opts.contextSize) {
    const encoder = getEncoderByName(opts.subscription?.preset?.tokenizer as any)
    const context = encoder?.count(prompt)

    if (context) {
      opts.contextSize = context
    }
  }

  const body: any = {
    request_id: opts.requestId,
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
    repetition_penalty_slope: opts.subscription?.preset?.repetitionPenaltySlope,
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
    stopping_strings: getStoppingStrings(opts, opts.gen, stops),
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
    json_schema_v3: opts.jsonSchema
      ? getJsonSchemaPayload(opts.jsonSchema, 'guided_json', opts)
      : undefined,
    reschema_prompt: opts.reschemaPrompt,
    context_size: opts.contextSize,
    xtc_threshold: gen.xtcThreshold,
    xtc_probability: gen.xtcProbability,

    dry_multiplier: gen.dryMultiplier,
    dry_base: gen.dryBase,
    dry_allowed_length: gen.dryAllowedLength,
    dry_range: gen.dryRange,
    dry_sequence_breakers: sequenceBreakers,
    reasoning: gen.reasoning,
  }

  if (opts.hasAttachments && opts.subscription?.preset?.subVisionModel) {
    body.messages = opts.messages
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
