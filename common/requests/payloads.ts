import { clamp, neat, tryParse } from '/common/util'
import { JsonField, toJsonSchema } from '/common/prompt'
import { defaultPresets } from '/common/default-preset'
import { ModelFormat } from '../presets/templates'
import { AppSchema } from '../types'
import type { SubscriptionPreset } from '/srv/adapter/agnaistic'
import { getPresetConnection } from '../providers'
import { getJsonSchemaPayload } from '../guidance/json-schema'

type MinOpts = {
  user: AppSchema.User

  gen?: Partial<AppSchema.GenSettings>
  settings?: Partial<AppSchema.GenSettings>
  subscription?: SubscriptionPreset
  prompt?: string
  messages?: any[]
  requestId?: string
  jsonSchema?: JsonField[]
  characters?: Record<string, AppSchema.Character>
  members?: AppSchema.Profile[]
  impersonate?: AppSchema.Character
  replyAs?: AppSchema.Character
  sender?: AppSchema.Profile
  char?: AppSchema.Character
}

export function getLocalPayload(opts: MinOpts, stops: string[] = []) {
  const gen = opts.settings!
  const body = getBasePayload(opts, stops)

  opts.characters

  // Always add baseline OpenAI format properties
  body.model ??= gen.thirdPartyModel || ''
  body.temperature ??= gen.temp
  body.top_p ??= gen.topP
  body.stop ??= getStoppingStrings(opts, opts.settings)
  body.stream = true

  if (gen.reasoning?.enabled) {
    body.reasoning = {
      exclude: !!gen.reasoning.exclude,
      summary: gen.reasoning.exclude ? 'None' : 'auto',
    }

    if (gen.reasoning.effort === 'custom') {
      body.reasoning.max_tokens = gen.reasoning.maxTokens
    } else {
      body.reasoning.effort = gen.reasoning.effort || 'low'
    }
  }

  // if (opts.kind === 'continue') {
  //   gen.tokenHealing = true
  // }

  return body
}

export function getThirdPartyPayload(opts: MinOpts, stops: string[] = []) {
  const gen = opts.gen || opts.settings || {}

  const body = getBasePayload(opts, stops)

  if (body.dynamic_temperature) {
    body.dynatemp_low = (gen.temp ?? 1) - (gen.dynatemp_range ?? 0)
    body.dynatemp_high = (gen.temp ?? 1) + (gen.dynatemp_range ?? 0)
    body.dynatemp_exponent = gen.dynatemp_exponent
  }

  if (gen.reasoning?.enabled) {
    body.reasoning = {
      exclude: gen.reasoning.exclude ?? false,
    }

    if (gen.reasoning.effort === 'custom') {
      body.reasoning.max_tokens = gen.reasoning.maxTokens ?? 0
    } else {
      body.reasoning.effort = gen.reasoning.effort ?? 'low'
    }
  }

  // if (opts.kind === 'continue') {
  //   gen.tokenHealing = true
  // }

  if (gen.jinjaEnabled) {
    body.chat_template = toImageJinjaTemplate({ format: gen.modelFormat, jinja: gen.jinjaTemplate })
  }

  return body
}

function getBasePayload(opts: MinOpts, stops: string[] = []) {
  const gen = opts.gen || opts.settings!
  const prompt = opts.prompt
  const messages = opts.messages

  const conn = getPresetConnection(gen, opts.user.providers)
  const format = opts.subscription?.preset?.thirdPartyFormat || conn.format

  const json_schema = opts.jsonSchema && gen.jsonEnabled ? toJsonSchema(opts.jsonSchema) : undefined

  const characterNames = Object.values(opts.characters || {})
    .map((c) => c.name.split(' '))
    .concat(opts.members?.map((m) => m.handle.split(' ')) || [])
    .flat()

  const sequenceBreakers = Array.from(
    new Set(
      [opts.replyAs?.name?.split(' '), opts.replyAs?.name?.split(' '), ...characterNames]
        .flat()
        .filter((t) => !!t?.trim())
    ).values()
  )
    .concat(gen.drySequenceBreakers || [])
    .flat()
    .filter((t) => !!t)

  if (!gen.temp) {
    gen.temp = 0.75
  }

  if (
    !format ||
    format === 'openai' ||
    format === 'openai-chat' ||
    format === 'openai-chatv2' ||
    format === 'kobold'
  ) {
    const model = gen.thirdPartyModel || gen.oaiModel || defaultPresets.openai.oaiModel

    const body: any = {
      model,
      prompt: messages ? undefined : prompt,
      messages,
      stream: true,
      temperature: gen.temp ?? defaultPresets.openai.temp,
      max_tokens: gen.maxTokens,
      top_p: gen.topP ?? 1,
      stop: getStoppingStrings(opts, opts.settings, stops),
    }

    const effort = getReasoningEffort(gen)
    if (effort) {
      body.reasoning_effort = effort
    }

    if (gen.presencePenalty) {
      body.presence_penalty = gen.presencePenalty
    }

    if (gen.frequencyPenalty) {
      body.frequency_penalty = gen.frequencyPenalty
    }

    return body
  }

  if (format === 'arli') {
    const body: any = {
      model: gen.providerId ? gen.thirdPartyModel : gen.arliModel || gen.thirdPartyModel,
      prompt: messages ? undefined : prompt,
      messages,
      stop: getStoppingStrings(opts, opts.settings, stops),
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

    if (gen.jsonEnabled && opts.jsonSchema && opts.char) {
      const char = opts.char! // TypeScript being stupid
      const schema = getJsonSchemaPayload(opts.jsonSchema, 'guided_json', { ...opts, char })
      body.guided_json = schema
      // body.guided_decoding_backend = 'outlines'
    }

    return body
  }

  if (format === 'vllm') {
    const body: any = {
      n: 1,
      prompt: messages ? undefined : prompt,
      messages,
      model: gen.thirdPartyModel,
      stream: true,
      temperature: gen.temp ?? 0.5,
      max_tokens: gen.maxTokens ?? 200,

      top_p: gen.topP ?? 1,
      min_p: gen.minP,
      top_k: gen.topK! < 1 ? -1 : gen.topK,

      stop: getStoppingStrings(opts, opts.settings, stops),
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

    if (gen.jinjaEnabled) {
      body.chat_template = toImageJinjaTemplate({
        jinja: gen.jinjaTemplate,
        format: gen.modelFormat,
      })
    } else {
      body.prompt = prompt
    }

    return body
  }

  if (format === 'ollama') {
    const payload: any = {
      prompt: messages ? undefined : prompt,
      messages,
      model: gen.thirdPartyModel,
      stream: !!gen.streamResponse,
      seed: Math.trunc(Math.random() * 1_000_000_000),
      max_tokens: gen.maxTokens,
      stop: getStoppingStrings(opts, opts.settings, stops),
      temperature: gen.temp,
      n: 1,
      top_p: gen.topP,
      presence_penalty: gen.presencePenalty,
      frequency_penalty: gen.frequencyPenalty,

      top_k: gen.topK,
      tfs_z: gen.tailFreeSampling,
      min_p: gen.minP,
      typical_p: gen.typicalP,
      repeat_last_n: gen.repetitionPenaltyRange,
      repeat_penalty: gen.repetitionPenalty,
      mirostat: gen.mirostatToggle && gen.mirostatTau ? 2 : 0,
      mirostat_tau: gen.mirostatTau,
      mirostat_eta: gen.mirostatLR,

      // ignore_eos: false,
      dynatemp_range: gen.dynatemp_range,
      dynatemp_exponent: gen.dynatemp_exponent,
      // options: {
      // },
    }

    if (opts.jsonSchema) {
      const structure = toCompatStructured(opts, opts.jsonSchema)
      payload.response_format = structure.format
    }

    return payload
  }

  if (format === 'mistral') {
    const body = {
      messages: messages || [{ role: 'user', content: prompt }],
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
      prompt: messages ? undefined : prompt,
      messages,
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
      stop: getStoppingStrings(opts, opts.settings, stops),
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
      prompt: messages ? undefined : prompt,
      messages,
      temperature: gen.temp,
      min_p: gen.minP,
      top_k: gen.topK,
      top_p: gen.topP,
      n_predict: gen.maxTokens,
      stop: getStoppingStrings(opts, opts.settings, stops),
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
      prompt: messages ? undefined : prompt,
      messages,
      temperature: gen.temp,
      min_p: gen.minP,
      top_k: gen.topK,
      top_p: gen.topP,
      top_a: gen.topA,
      stop: getStoppingStrings(opts, opts.settings, stops),
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
      stream: true,
      temperature: gen.temp ?? 0.5,
      max_tokens: gen.maxTokens ?? 200,
      best_of: gen.swipesPerGeneration,
      n: gen.swipesPerGeneration,
      prompt,

      top_p: gen.topP ?? 1,
      min_p: gen.minP,
      top_k: gen.topK! < 1 ? -1 : gen.topK,
      top_a: gen.topA,
      stop: getStoppingStrings(opts, opts.settings, stops),
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
      stop_conditions: getStoppingStrings(opts, opts.settings, stops),
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
      prompt: messages ? undefined : prompt,
      messages,
      max_length: gen.maxTokens,
      rep_pen: gen.repetitionPenalty,
      temperature: gen.temp,
      tfs: gen.tailFreeSampling,
      min_p: gen.minP,
      top_p: gen.topP,
      top_k: gen.topK,
      top_a: gen.topA,
      typical: gen.typicalP,
      stop_sequence: getStoppingStrings(opts, opts.settings, stops),
      dynatemp_range: gen.dynatemp_range,
      dynatemp_exponent: gen.dynatemp_exponent,
      smoothing_factor: gen.smoothingFactor,
      rep_pen_range: gen.repetitionPenaltyRange,
      rep_pen_slope: gen.repetitionPenaltySlope,
    }
    return body
  }

  if (format === 'featherless') {
    const payload: any = {
      model: gen.providerId ? gen.thirdPartyModel : gen.featherlessModel || gen.thirdPartyModel,
      prompt: messages ? undefined : prompt,
      messages,
      stop: getStoppingStrings(opts, opts.settings, stops),
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
}

export function getStoppingStrings(
  opts: MinOpts,
  settings: Partial<AppSchema.GenSettings> | undefined,
  extras: string[] = []
) {
  const seen = new Set<string>(extras)
  const unique = new Set<string>(extras)

  if (!settings?.disableNameStops) {
    const chars = Object.values(opts.characters || {})
    if (opts.impersonate) {
      chars.push(opts.impersonate)
    }

    for (const char of chars) {
      if (seen.has(char.name)) continue
      if (char.name === opts.replyAs?.name) continue
      unique.add(`\n${char.name}:`)
      seen.add(char.name)
    }

    for (const member of opts.members || []) {
      if (seen.has(member.handle)) continue
      if (member.handle === opts.replyAs?.name) continue
      unique.add(`\n${member.handle}:`)
      seen.add(member.handle)
    }
  }

  if (settings?.stopSequences && !Array.isArray(settings.stopSequences)) {
    const values = Object.values(settings?.stopSequences) as string[]
    settings.stopSequences = values
    for (const stop of values) {
      seen.add(stop)
      unique.add(stop)
    }
  } else if (settings?.stopSequences) {
    for (const seq of settings.stopSequences) {
      unique.add(seq)
    }
  }

  const uniques = Array.from(unique.values())
  const stops = uniques.filter((str) => !!str)
  return stops
}

export function toImageJinjaTemplate(opts: { jinja?: string; format?: ModelFormat }) {
  let format = opts.format || 'None'
  let imageToken = ''
  switch (format) {
    case 'ChatML':
    case 'Llama3':
      imageToken = '<|image|>'
      break

    case 'Mistral':
      imageToken = '[IMG]'
      break

    case 'Gemma':
      imageToken = '<start_of_image>'
      break

    default:
      // Qwen
      imageToken = '<|vision_start|><|image_pad|><|vision_end|>'
      break
  }

  if (opts.jinja) {
    return tryParse(opts.jinja) || opts.jinja
  }

  const template = neat`
{%- set default_system_message = "You are an uncensored explicit fantasy fictional roleplay chat bot. Follow the character's personality defined below and provide the character's next response in the roleplay chat. Provide an in-character response no matter what." %}
{{- bos_token }}
{%- if messages[0]['role'] == 'system' %}
  {%- set system_message = messages[0]['content'] %}
  {%- set loop_messages = messages[1:] %}
{%- else %}
  {%- set system_message = default_system_message %}
  {%- set loop_messages = messages %}
{%- endif %}

{{- system_message }}

{%- for message in loop_messages %}
  {%- if message['role'] == 'user' %}
    {%- if message['content'] is string %}
      {{- message['content'] }}
    {%- else %}
      
    {%- for block in message['content'] %}
      {%- if block['type'] == 'text' %}
        {{- block['text'] }}
      {%- elif block['type'] == 'image' or block['type'] == 'image_url' %}
        {{- '${imageToken}' }}
      {%- else %}
        {{- raise_exception('Only text and image blocks are supported in message content!') }}
      {%- endif %}
    {%- endfor %}
    
  {%- endif %}
  {%- elif message['role'] == 'system' %}
    {{- message['content'] }}
  {%- elif message['role'] == 'assistant' %}
    {{- message['content'] }}
  {%- else %}
    {{- raise_exception('Only user, system and assistant roles are supported! Found: ' + message['role']) }}
  {%- endif %}
{%- endfor %}`
  return template
}

function getReasoningEffort(gen: Partial<AppSchema.GenSettings>) {
  const cfg = gen.reasoning
  if (!cfg?.enabled) return
  if (cfg.effort !== 'custom') return cfg.effort

  if (!cfg.maxTokens || cfg.maxTokens < 0 || isNaN(cfg.maxTokens) || !gen.maxTokens) return
  const percent = cfg.maxTokens / gen.maxTokens

  if (percent >= 0.65) return 'high'
  if (percent >= 0.35) return 'medium'
  return 'low'
}

type OutgoingFields = Record<
  string,
  { type: string; description?: string; valid?: string; maxLength?: number }
>

export function toCompatStructured(opts: MinOpts, jsonSchema: any) {
  const responseField = `${opts.replyAs?.name || opts.char?.name}'s response`
  const base: OutgoingFields = {
    [responseField]: { type: 'string' },
  }
  const fields: OutgoingFields = jsonSchema.reduce((prev: OutgoingFields, field: JsonField) => {
    const { disabled, name, type, ...rest } = field
    prev[field.name] = {
      type: type.type,
      ...rest,
    }
    return prev
  }, base)

  // OpenAI format
  // https://platform.openai.com/docs/guides/structured-outputs
  const required = Object.keys(fields)

  const format = {
    type: 'json_schema',
    json_schema: {
      name: 'response',
      type: 'object',
      strict: true,
      schema: {
        strict: true,
        properties: fields,
        required,
        additionalProperties: false,
      },
    },
  }

  return { format, fields, required }
}
