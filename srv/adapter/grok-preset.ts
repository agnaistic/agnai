import { PresetAISettings } from '/common/adapters'
import { AppSchema } from '/common/types'

export type GrokEffort = 'low' | 'medium' | 'high' | 'xhigh'

export type GrokModelSpec = {
  context: number
  /** required: the model always reasons. unsupported: reasoning_effort is rejected. */
  reasoning: 'required' | 'unsupported'
  efforts: GrokEffort[]
}

const GROK_EFFORT: GrokEffort[] = ['low', 'medium', 'high']
const GROK_EFFORT_XHIGH: GrokEffort[] = ['low', 'medium', 'high', 'xhigh']

/** Used only when the model list has not returned a context_length. */
export const GROK_CONTEXT_FALLBACK = 500000

const GROK_REASONING: Record<string, Pick<GrokModelSpec, 'reasoning' | 'efforts'>> = {
  'grok-4.7': { reasoning: 'required', efforts: GROK_EFFORT_XHIGH },
  'grok-4.6': { reasoning: 'required', efforts: GROK_EFFORT_XHIGH },
  'grok-4.5': { reasoning: 'required', efforts: GROK_EFFORT },
  'grok-4.3': { reasoning: 'required', efforts: GROK_EFFORT },
  'grok-4.20-0309-reasoning': { reasoning: 'required', efforts: GROK_EFFORT },
  'grok-4.20-0309-non-reasoning': { reasoning: 'unsupported', efforts: [] },
  'grok-build-0.1': { reasoning: 'required', efforts: GROK_EFFORT },
  fallback: { reasoning: 'required', efforts: GROK_EFFORT_XHIGH },
}

/** One row from GET /v1/models. Context and price come from here, not a local catalog. */
export type GrokListedModel = {
  id?: string
  aliases?: string[]
  context_length?: number | null
  prompt_text_token_price?: number | null
  cached_prompt_text_token_price?: number | null
  completion_text_token_price?: number | null
  capabilities?: {
    reasoning_effort?: string[]
    default_reasoning_effort?: string | null
  }
}

const GROK_EFFORTS: GrokEffort[] = ['low', 'medium', 'high', 'xhigh']

export function findGrokListedModel(models: any[] | undefined, id?: string) {
  if (!id || !models?.length) return
  return models.find(
    (model) => model?.id === id || (Array.isArray(model?.aliases) && model.aliases.includes(id))
  ) as GrokListedModel | undefined
}

/** xAI prices are USD cents per 100 million tokens. */
export function grokPriceLabel(model?: GrokListedModel) {
  const input = grokMillionPrice(model?.prompt_text_token_price)
  const cached = grokMillionPrice(model?.cached_prompt_text_token_price)
  const output = grokMillionPrice(model?.completion_text_token_price)
  const parts = [
    input ? `${input} in` : '',
    cached ? `${cached} cached` : '',
    output ? `${output} out` : '',
  ].filter(Boolean)
  if (!parts.length) return
  return `${parts.join(' / ')} per 1M`
}

function grokMillionPrice(centsPer100M?: number | null) {
  if (centsPer100M == null || Number.isNaN(centsPer100M)) return
  return `$${(centsPer100M / 10000).toFixed(2)}`
}

export function grokSpec(model?: string, listed?: GrokListedModel): GrokModelSpec {
  const known =
    (model && GROK_REASONING[model]) ||
    (model?.includes('non-reasoning')
      ? { reasoning: 'unsupported' as const, efforts: [] as GrokEffort[] }
      : GROK_REASONING.fallback)

  const apiEfforts = (listed?.capabilities?.reasoning_effort || []).filter((effort): effort is GrokEffort =>
    GROK_EFFORTS.includes(effort as GrokEffort)
  )
  const fromApi = listed?.capabilities && Array.isArray(listed.capabilities.reasoning_effort)

  return {
    context: listed?.context_length || GROK_CONTEXT_FALLBACK,
    reasoning: fromApi ? (apiEfforts.length ? 'required' : 'unsupported') : known.reasoning,
    efforts: fromApi ? apiEfforts : known.efforts,
  }
}
export const GROK_PRESET_SETTINGS: readonly (keyof PresetAISettings)[] = [
  'temp',
  'topP',
  'maxTokens',
  'maxContextLength',
  'streamResponse',
  'thirdPartyKey',
]

/** Values written onto a preset when Grok is selected on the Generation Presets page. */
export function grokPresetDefaults(state?: {
  reasoning?: AppSchema.GenSettings['reasoning']
}): Partial<AppSchema.GenSettings> {
  return {
    service: 'kobold',
    thirdPartyFormat: 'grok',
    temp: 1,
    topP: 1,
    maxTokens: 2048,
    streamResponse: true,
    useMaxContext: true,
    maxContextLength: GROK_CONTEXT_FALLBACK,
    frequencyPenalty: 0,
    presencePenalty: 0,
    stopSequences: [],
    reasoning: {
      start: state?.reasoning?.start || '',
      end: state?.reasoning?.end || '',
      maxTokens: 0,
      exclude: true,
      enabled: true,
      effort: 'high',
    },
  }
}

/** Context and reasoning fields for the selected Grok model version. */
export function grokModelPatch(
  model: string,
  reasoning?: AppSchema.GenSettings['reasoning'],
  listed?: GrokListedModel
): Partial<AppSchema.GenSettings> {
  const spec = grokSpec(model, listed)
  const current = reasoning?.effort
  const effort = (spec.efforts as string[]).includes(current || '')
    ? (current as GrokEffort)
    : spec.reasoning === 'unsupported'
      ? 'none'
      : spec.efforts.includes('high')
        ? 'high'
        : spec.efforts[spec.efforts.length - 1] || 'high'

  return {
    useMaxContext: true,
    maxContextLength: spec.context,
    reasoning: {
      start: reasoning?.start || '',
      end: reasoning?.end || '',
      maxTokens: reasoning?.maxTokens || 0,
      exclude: reasoning?.exclude ?? true,
      enabled: spec.reasoning !== 'unsupported' && (reasoning?.enabled ?? true),
      effort,
    },
  }
}
