import { AdapterProps } from './type'
import { getStoppingStrings } from './prompt'
import { clamp } from '/common/util'

export function getThirdPartyPayload(opts: AdapterProps, stops: string[] = []) {
  const { gen } = opts
  const body = getBasePayload(opts, stops)

  if (body.dynamic_temperature) {
    body.dynatemp_low = (gen.temp ?? 1) - (gen.dynatemp_range ?? 0)
    body.dynatemp_high = (gen.temp ?? 1) + (gen.dynatemp_range ?? 0)
    body.dynatemp_exponent = gen.dynatemp_exponent
  }

  return body
}

function getBasePayload(opts: AdapterProps, stops: string[] = []) {
  const { gen, prompt } = opts

  if (gen.thirdPartyFormat === 'mistral') {
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

  if (gen.thirdPartyFormat === 'tabby') {
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
    }

    if (gen.dynatemp_range) {
      body.min_temp = (gen.temp ?? 1) - (gen.dynatemp_range ?? 0)
      body.max_temp = (gen.temp ?? 1) + (gen.dynatemp_range ?? 0)
      body.temp_exponent = gen.dynatemp_exponent
    }

    return body
  }

  if (gen.service === 'kobold' && gen.thirdPartyFormat === 'llamacpp') {
    const body = {
      prompt,
      temperature: gen.temp,
      min_p: gen.minP,
      top_k: gen.topK,
      top_p: gen.topP,
      n_predict: gen.maxTokens,
      stop: getStoppingStrings(opts, stops),
      stream: true,
      frequency_penality: gen.frequencyPenalty,
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
    }
    return body
  }

  if (gen.service === 'kobold' && gen.thirdPartyFormat === 'aphrodite') {
    const body = {
      model: gen.thirdPartyModel || '',
      stream: opts.kind === 'summary' ? false : gen.streamResponse ?? true,
      temperature: gen.temp ?? 0.5,
      max_tokens: gen.maxTokens ?? 200,
      best_of: gen.swipesPerGeneration,
      n: gen.swipesPerGeneration,
      prompt,

      top_p: gen.topP ?? 1,
      min_p: gen.minP,
      top_k: gen.topK,
      top_a: gen.topA,
      stop: getStoppingStrings(opts, stops),
      dynatemp_range: gen.dynatemp_range,
      dynatemp_exponent: gen.dynatemp_exponent,
      smoothing_factor: gen.smoothingFactor,

      mirostat_mode: gen.mirostatToggle ? 2 : 0,
      mirostat_tau: gen.mirostatTau,
      mirostat_eta: gen.mirostatLR,

      tfs: gen.tailFreeSampling,
      typical_p: gen.typicalP,

      repetition_penalty: gen.repetitionPenalty,
      presence_penality: gen.presencePenalty ?? 0,
      frequency_penalty: gen.frequencyPenalty ?? 0,
      ignore_eos: gen.banEosToken,
      skip_special_tokens: gen.skipSpecialTokens,
      eta_cutoff: gen.etaCutoff,
      epsilon_cutoff: gen.epsilonCutoff,
    }

    return body
  }

  if (gen.service === 'kobold' && gen.thirdPartyFormat === 'exllamav2') {
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
      min_p: gen.minP,
    }
    return body
  }

  if (gen.service === 'kobold' && gen.thirdPartyFormat === 'koboldcpp') {
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
      trim_stop: gen.trimStop,
      rep_pen_range: gen.repetitionPenaltyRange,
      rep_pen_slope: gen.repetitionPenaltySlope,
    }
    return body
  }

  const body: any = {
    prompt,
    context_limit: gen.maxContextLength,
    max_new_tokens: gen.maxTokens,
    do_sample: gen.doSample ?? true,
    temperature: gen.temp,
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
    smoothing_factor: gen.smoothingFactor,
    tfs: gen.tailFreeSampling,
    mirostat_mode: gen.mirostatTau ? 2 : 0,
    mirostat_tau: gen.mirostatTau,
    mirostat_eta: gen.mirostatLR,
    guidance: opts.guidance,
    placeholders: opts.placeholders,
    lists: opts.lists,
    previous: opts.previous,
  }

  return body
}
