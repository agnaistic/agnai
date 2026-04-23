import { AIAdapter, ThirdPartyFormat } from './adapters'
import { AppSchema } from './types'
import { Provider } from './types/presets'

export const KNOWN_PROVIDERS: Record<string, ProviderDefinition> = {
  claude: {
    name: 'Anthropic',
    url: 'https://api.anthropic.com/v1',
    formats: [
      { type: 'service', value: 'claude-v2' },
      { type: 'service', value: 'claude' },
    ],
  },
  openrouter: {
    name: 'OpenRouter',
    url: 'https://openrouter.ai/api/v1',
    formats: [
      {
        type: 'service',
        value: 'openrouter',
        subs: [
          { value: '', name: 'Standard' },
          { value: 'mistral', name: 'Mistral' },
        ],
      },
      { type: 'service', value: 'openrouter-completion' },
    ],
  },
  gemini: {
    name: 'Google AI',
    url: 'https://generativelanguage.googleapis.com/v1beta/openai',
    formats: [{ type: 'format', value: 'gemini' }],
  },
  novel: { name: 'NovelAI', url: '', formats: [{ type: 'service', value: 'novel' }] },
  horde: { name: 'Horde', url: '', formats: [{ type: 'service', value: 'horde' }] },
  venus: { name: 'Venus', url: '', formats: [{ type: 'service', value: 'venus' }] },
  mancer: { name: 'Mancer', url: '', formats: [{ type: 'service', value: 'mancer' }] },

  openai: {
    name: 'OpenAI',
    url: 'https://api.openai.com/v1',
    formats: [
      {
        type: 'service',
        value: 'openai',
        subs: [
          { value: '', name: 'Standard' },
          { value: 'reasoning', name: 'Reasoning' },
        ],
      },
    ],
  },
  mistral: {
    name: 'Mistral',
    url: 'https://api.mistral.ai/v1',
    formats: [
      { type: 'format', value: 'openai-chatv2', subs: [{ value: 'mistral', name: 'Mistral' }] },
    ],
  },
  deepseek: {
    name: 'DeepSeek',
    url: 'https://api.deepseek.com/v1',
    formats: [{ type: 'format', value: 'openai-chatv2' }],
  },
  nanogpt: {
    name: 'NanoGPT',
    url: 'https://nano-gpt.com/api/v1',
    formats: [{ type: 'format', value: 'openai-chatv2' }],
  },
  arli: {
    name: 'ArliAI',
    url: 'https://api.arliai.com/v1',
    formats: [{ type: 'format', value: 'arli' }],
  },
  featherless: {
    name: 'Featherless',
    url: 'https://api.featherless.ai/v1',
    formats: [{ type: 'format', value: 'featherless' }],
  },
  chutes: {
    name: 'Chutes',
    url: 'https://llm.chutes.ai/v1',
    formats: [
      { type: 'format', value: 'openai-chatv2' },
      { type: 'format', value: 'openai' },
    ],
  },
  zai: {
    name: 'Z.ai',
    url: `https://api.z.ai/api/paas/v4`,
    formats: [
      {
        type: 'format',
        value: 'openai-chatv2',
        subs: [
          { name: 'Standard', value: '' },
          { name: 'Reasoning', value: 'reasoning' },
        ],
      },
    ],
  },
  deepinfra: {
    name: 'DeepInfra',
    url: `https://api.deepinfra.com/v1/openai`,
    formats: [{ type: 'format', value: 'openai-chatv2' }],
  },
  xai: {
    name: 'x.AI',
    url: `https://api.x.ai/v1`,
    formats: [{ type: 'format', value: 'openai-chatv2' }],
  },
}

export const KNOWN_SELF_HOST: Record<string, ProviderDefinition> = {
  local: {
    name: 'Self-Host / OpenAI Compatible',
    url: '',
    formats: [
      { type: 'format', name: 'OpenAI Compat', url: '', value: 'openai-chatv2' },
      { type: 'format', value: 'tabby', url: 'http://localhost:5000/v1' },
      { type: 'format', value: 'aphrodite', url: 'http://localhost:2242/v1' },
      { type: 'format', value: 'vllm', url: 'http://localhost:8000/v1' },
      { type: 'format', value: 'llamacpp', url: 'http://localhost:8080/v1' },
      { type: 'format', value: 'koboldcpp', url: 'http://localhost:5001/v1' },
      { type: 'format', value: 'ollama', url: 'http://localhost:11434/v1' },
      {
        type: 'format',
        name: 'LM Studio',
        value: 'openai-chatv2',
        url: 'http://localhost:1234/v1',
      },
      { type: 'format', name: 'LocalAI', value: 'openai-chatv2', url: 'http://localhost:8080/v1' },
      { type: 'format', value: 'ooba', url: 'http://localhost:7860/v1' },
    ],
  },
}

export const CUSTOM_PROVIDERS: Record<string, ProviderDefinition> = {
  'openai-chatv2': {
    name: 'OpenAI Compat',
    formats: [
      {
        type: 'format',
        value: 'openai-chatv2',
        subs: [
          { value: '', name: 'Standard' },
          { value: 'reasoning', name: 'GPT-5/Reasoning' },
        ],
      },
      {
        type: 'format',
        value: 'openai-chat',
        subs: [
          { value: '', name: 'Standard' },
          { value: 'reasoning', name: 'GPT-5/Reasoning' },
        ],
      },
      { type: 'format', value: 'openai' },
    ],
  },
  remote: {
    name: 'Remotely Hosted',
    url: '',
    formats: [
      { type: 'format', value: 'tabby' },
      { type: 'format', value: 'aphrodite' },
      { type: 'format', value: 'vllm' },
      { type: 'format', value: 'llamacpp' },
      { type: 'format', value: 'koboldcpp' },
      { type: 'format', value: 'ollama' },
      { type: 'format', value: 'claude' },
      // { type: 'format', value: 'gemini' },
      {
        type: 'format',
        name: 'LM Studio',
        value: 'lm-studio',
      },
      { type: 'format', value: 'ooba' },
      { type: 'format', name: 'Other (Generic OpenAI)', value: 'openai-chatv2' },
    ],
  },
}

export type ProviderFormat =
  | { type: 'service'; name?: string; value: AIAdapter; url?: string; subs?: ProviderSubFormat[] }
  | {
      type: 'format'
      name?: string
      value: ThirdPartyFormat
      url?: string
      subs?: ProviderSubFormat[]
    }

export type ProviderSubFormat = { value: string; name: string }

export type ProviderDefinition = {
  name: string
  url?: string
  // service?: AIAdapter
  // format?: ThirdPartyFormat
  formats?: ProviderFormat[]
}

type ProviderCategory = 'custom' | 'known' | 'self' | 'agnai'

export type PresetConnection = {
  provider?: Provider
  detail?: ProviderDefinition
  category?: ProviderCategory
  preset: AppSchema.UserGenPreset
  service: AppSchema.UserGenPreset['service']
  format?: ThirdPartyFormat
  url?: string
  key?: string
}

export function getPresetConnection(
  preset: Partial<AppSchema.GenSettings>,
  providers: AppSchema.Provider[] | undefined
): PresetConnection {
  const copy = { ...preset } as AppSchema.UserGenPreset
  const provider = providers?.find((p) => p._id === preset.providerId)
  const validProviderId = preset.providerId && preset.providerId !== 'agnaistic' ? !!provider : true

  const isAgnai =
    !validProviderId || // Provider preset, but invalid provider ID
    preset.providerId === 'agnaistic' || // Provider preset
    (!preset.providerId && preset.service === 'agnaistic') // Legacy preset

  if (isAgnai) {
    copy.service = 'agnaistic'
    copy.thirdPartyFormat = undefined

    return {
      provider: undefined as Provider | undefined,
      detail: undefined as ProviderDefinition | undefined,
      category: 'agnai' as ProviderCategory,
      preset: copy,
      service: 'agnaistic' as const,
      format: undefined,
      url: '',
      key: '',
    }
  }

  if (provider) {
    const conn = getProviderConnection(provider)

    // We always disable this feature when using a provider
    copy.thirdPartyUrlNoSuffix = false

    if (conn.service) {
      copy.service = conn.service
      copy.thirdPartyFormat = undefined
    } else {
      copy.service = undefined
      copy.thirdPartyFormat = conn.format
    }

    if (conn.url) copy.thirdPartyUrl = conn.url
    if (conn.key) copy.thirdPartyKey = conn.key

    const providerModel = preset.providerModels?.[preset.providerId || 'none']
    if (providerModel) {
      copy.thirdPartyModel = providerModel
    }

    copy.localRequests = conn.local
    copy.thirdPartyKey = conn.key

    return {
      provider,
      detail: conn.detail,
      category: conn.category,
      preset: copy,
      service: conn.service,
      format: conn.format,
      url: conn.url,
      key: conn.key,
    }
  }

  return {
    provider: undefined,
    detail: undefined,
    category: undefined,
    preset: copy,
    service: preset.service,
    format: preset.thirdPartyFormat,
    url: preset.thirdPartyUrl,
    key: preset.thirdPartyKey,
  }
}

export function assertProviderDetail(provider: string) {
  const category = provider.split('-')[0] as ProviderCategory
  const type = provider.replace('known-', '').replace('self-', '').replace('custom-', '')

  switch (category) {
    case 'custom':
      return { category, type, detail: CUSTOM_PROVIDERS[type] }

    case 'known':
      return { category, type, detail: KNOWN_PROVIDERS[type] }

    case 'self':
      return { category, type, detail: KNOWN_SELF_HOST[type] }
  }

  throw new Error(`Unknown provider identifier: ${provider}`)
}

export function getSafeProviderDetail(provider: string) {
  const id = getAlias(provider)
  const category = id.split('-')[0] as ProviderCategory
  let type = id.replace('known-', '').replace('self-', '').replace('custom-', '')

  if (KNOWN_ALIASES[type]) {
    type = KNOWN_ALIASES[type]
  }

  switch (category) {
    case 'custom': {
      return { category, type, detail: CUSTOM_PROVIDERS[type] }
    }

    case 'known':
      return { category, type, detail: KNOWN_PROVIDERS[type] }

    case 'self':
      return { category, type, detail: KNOWN_SELF_HOST[type] }

    case 'agnai':
      return { category, type: category, detail: undefined }
  }
}

const KNOWN_ALIASES: Record<string, string> = {
  'openrouter-completion': 'openrouter',
}

export function getProviderLabel(provider: AppSchema.Provider) {
  const info = getSafeProviderDetail(provider.provider)

  switch (info.category) {
    case 'known':
      return info.detail?.name || 'Provider'

    case 'self':
      return info.detail?.name || 'Local'

    case 'custom':
      return provider.name || 'Custom'

    case 'agnai':
      return 'Agnai'
  }
}

export function getProviderCategoryLabel(cate: ProviderCategory | undefined) {
  switch (cate) {
    case 'known':
      return 'Known'

    case 'self':
      return 'Local'

    case 'custom':
      return 'Custom'

    case 'agnai':
      return 'Agnai'

    default:
      return 'Legacy'
  }
}

export function getProviderConnection(provider: AppSchema.Provider) {
  const { category, detail } = assertProviderDetail(provider.provider)
  let url = ''

  let service: AIAdapter | undefined
  let format: ThirdPartyFormat | undefined

  if (provider.url) {
    url = provider.url
  } else if (category !== 'known' && detail.url) {
    url = detail.url
  } else if (category === 'known' && detail.url) {
    url = detail.url
  }

  const prvFormat =
    detail.formats?.length === 1 ? detail.formats[0] : provider.format || detail.formats?.[0]

  if (prvFormat) {
    switch (prvFormat.type) {
      case 'format':
        format = prvFormat.value
        break

      case 'service':
        service = prvFormat.value
        break
    }
  }

  return {
    id: provider._id,
    name: provider.name,
    detail,
    category,
    label: getProviderCategoryLabel(category),
    service,
    format,
    url,
    key: provider.key,
    local: category === 'self',
  }
}

function getAlias(provider: string) {
  switch (provider) {
    case 'claude-v2':
      return 'claude'
  }

  return provider
}
