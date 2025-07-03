import { AIAdapter, ThirdPartyFormat } from './adapters'
import { AppSchema } from './types'

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
      { type: 'service', value: 'openrouter' },
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
    formats: [{ type: 'service', value: 'openai' }],
  },
  mistral: {
    name: 'Mistral',
    url: 'https://api.mistral.ai/v1',
    formats: [{ type: 'format', value: 'openai-chatv2' }],
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
}

export const KNOWN_SELF_HOST: Record<string, ProviderDefinition> = {
  local: {
    name: 'Locally Hosted',
    url: '',
    formats: [
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
      { type: 'format', name: 'Other', url: '', value: 'openai-chatv2' },
    ],
  },
}

export const CUSTOM_PROVIDERS: Record<string, ProviderDefinition> = {
  'openai-chatv2': {
    name: 'OpenAI Compatible',
    formats: [
      { type: 'format', value: 'openai-chatv2' },
      { type: 'format', value: 'openai-chat' },
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
      {
        type: 'format',
        name: 'LM Studio',
        value: 'openai-chatv2',
      },
      { type: 'format', value: 'ooba' },
      { type: 'format', name: 'Other', value: 'openai-chatv2' },
    ],
  },
}

export type ProviderFormat =
  | { type: 'service'; name?: string; value: AIAdapter; url?: string }
  | { type: 'format'; name?: string; value: ThirdPartyFormat; url?: string }

export type ProviderDefinition = {
  name: string
  url?: string
  // service?: AIAdapter
  // format?: ThirdPartyFormat
  formats?: ProviderFormat[]
}

type ProviderCategory = 'custom' | 'known' | 'self' | 'agnai'

export type PresetConnection = ReturnType<typeof getPresetConnection>

export function getPresetConnection(
  preset: Partial<AppSchema.GenSettings>,
  providers: AppSchema.Provider[] | undefined
) {
  const copy = { ...preset }

  const isAgnai =
    preset.providerId === 'agnaistic' || (!preset.providerId && preset.service === 'agnaistic')

  if (isAgnai) {
    copy.service = 'agnaistic'
    copy.thirdPartyFormat = undefined

    return {
      provider: undefined,
      detail: undefined,
      category: 'agnai' as ProviderCategory,
      preset: copy,
      service: 'agnaistic' as const,
      format: undefined,
      url: '',
      key: '',
    }
  }

  const provider = providers?.find((p) => p._id === preset.providerId)

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
  const type = id.replace('known-', '').replace('self-', '').replace('custom-', '')

  switch (category) {
    case 'custom': {
      return { category, type, detail: CUSTOM_PROVIDERS[type] }
    }

    case 'known':
      return { category, type, detail: KNOWN_PROVIDERS[type] }

    case 'self':
      return { category, type, detail: KNOWN_SELF_HOST[type] }

    case 'agnai':
      return { category, type: category, defail: undefined }
  }
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
