import { GROK_LIMITS, PresetAISettings } from '/common/adapters'
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

export const GROK_SPECS: Record<string, GrokModelSpec> = {
  'grok-4.7': { context: GROK_LIMITS['grok-4.7'], reasoning: 'required', efforts: GROK_EFFORT_XHIGH },
  'grok-4.6': { context: GROK_LIMITS['grok-4.6'], reasoning: 'required', efforts: GROK_EFFORT_XHIGH },
  'grok-4.5': { context: GROK_LIMITS['grok-4.5'], reasoning: 'required', efforts: GROK_EFFORT },
  'grok-4.3': { context: GROK_LIMITS['grok-4.3'], reasoning: 'required', efforts: GROK_EFFORT },
  'grok-4.20-0309-reasoning': {
    context: GROK_LIMITS['grok-4.20-0309-reasoning'],
    reasoning: 'required',
    efforts: GROK_EFFORT,
  },
  'grok-4.20-0309-non-reasoning': {
    context: GROK_LIMITS['grok-4.20-0309-non-reasoning'],
    reasoning: 'unsupported',
    efforts: [],
  },
  'grok-build-0.1': { context: GROK_LIMITS['grok-build-0.1'], reasoning: 'required', efforts: GROK_EFFORT },
  fallback: { context: GROK_LIMITS.fallback, reasoning: 'required', efforts: GROK_EFFORT_XHIGH },
}

/** Sampler fields the Grok chat API accepts. The presets page reads this list. */
export const GROK_PRESET_SETTINGS: readonly (keyof PresetAISettings)[] = [
  'temp',
  'topP',
  'maxTokens',
  'maxContextLength',
  'streamResponse',
  'thirdPartyKey',
]

export function grokSpec(model?: string): GrokModelSpec {
  if (model && GROK_SPECS[model]) return GROK_SPECS[model]
  if (model?.includes('non-reasoning')) {
    return { context: GROK_SPECS.fallback.context, reasoning: 'unsupported', efforts: [] }
  }
  return GROK_SPECS.fallback
}

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
    maxContextLength: GROK_SPECS.fallback.context,
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
  reasoning?: AppSchema.GenSettings['reasoning']
): Partial<AppSchema.GenSettings> {
  const spec = grokSpec(model)
  const current = reasoning?.effort
  const effort = (spec.efforts as string[]).includes(current || '')
    ? (current as GrokEffort)
    : spec.reasoning === 'unsupported'
      ? 'none'
      : 'high'

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
