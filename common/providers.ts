import { AIAdapter, ThirdPartyFormat } from './adapters'
import { AppSchema } from './types'

type ProviderDefinition = {
  name: string
  url?: string
  service?: AIAdapter
  format?: ThirdPartyFormat
}

type ProviderCategory = 'custom' | 'known' | 'self'

export function getPresetConnection(
  preset: Partial<AppSchema.GenSettings>,
  providers: AppSchema.Provider[] | undefined
) {
  let service: AIAdapter | undefined
  let format: ThirdPartyFormat | undefined
  let url = ''

  const copy = { ...preset }
  const provider = providers?.find((p) => p._id === preset.providerId)
  if (provider) {
    const { category, detail } = assertProviderDetail(provider.provider)

    if (provider.url) {
      url = provider.url
    } else if (category !== 'known' && detail.url) {
      url = detail.url
    } else if (category === 'known' && detail.url) {
      url = detail.url
    }

    if (url) copy.thirdPartyUrl = url
    if (service) copy.service = service
    if (format) copy.thirdPartyFormat = format
    if (category === 'self') copy.localRequests = true
    copy.thirdPartyKey = provider.key

    if (detail.format) {
      format = detail.format
    }

    if (detail.service) {
      service = detail.service
    }

    return { provider, detail, category, preset: copy, service, format, url, key: provider.key }
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
  }
}

function getAlias(provider: string) {
  switch (provider) {
    case 'claude-v2':
      return 'claude'
  }

  return provider
}

export const KNOWN_PROVIDERS: Record<string, ProviderDefinition> = {
  claude: { name: 'Anthropic', url: 'https://api.anthropic.com/v1', service: 'claude' },
  openrouter: { name: 'OpenRouter', url: 'https://openrouter.ai/api/v1', service: 'openrouter' },
  gemini: {
    name: 'Google AI',
    url: 'https://generativelanguage.googleapis.com/v1beta/openai',
    format: 'gemini',
  },
  novel: { name: 'NovelAI', url: '', service: 'novel' },
  horde: { name: 'Horde', url: '', service: 'horde' },
  venus: { name: 'Venus', url: '', service: 'venus' },
  mancer: { name: 'Mancer', url: '', service: 'mancer' },

  openai: { name: 'OpenAI', url: '', service: 'openai' },
  mistral: { name: 'Mistral', url: 'https://api.mistral.ai/v1', format: 'openai-chatv2' },
  deepseek: { name: 'DeepSeek', url: 'https://api.deepseek.com/v1', format: 'openai-chatv2' },
  nanogpt: { name: 'NanoGPT', url: 'https://nano-gpt.com/api/v1', format: 'openai-chatv2' },
  arli: { name: 'ArliAI', url: 'https://api.arliai.com/v1', format: 'arli' },
  featherless: {
    name: 'Featherless',
    url: 'https://api.featherless.ai/v1',
    format: 'featherless',
    // format: 'openai-chatv2',
  },
}

export const KNOWN_SELF_HOST: Record<string, ProviderDefinition> = {
  ooba: { name: 'Ooba Textgen', url: 'http://localhost:7860/v1', format: 'openai-chatv2' },
  tabby: { name: 'TabbyAPI', url: 'http://localhost:5000/v1', format: 'openai-chatv2' },
  aphrodite: { name: 'Aphrodite', url: 'http://localhost:2242/v1', format: 'openai-chatv2' },
  vllm: { name: 'vLLM', url: 'http://localhost:8000/v1', format: 'openai-chatv2' },
  llamacpp: { name: 'Llama.cpp', url: 'http://localhost:8080/v1', format: 'openai-chatv2' },
  koboldcpp: { name: 'Kobold.cpp', url: 'http://localhost:5001/v1', format: 'openai-chatv2' },
  localai: { name: 'LocalAI', url: 'http://localhost:8080/v1', format: 'openai-chatv2' },
  ollama: { name: 'Ollama', url: 'http://localhost:11434/v1', format: 'openai-chatv2' },
  lmstudio: { name: 'LM Studio', url: 'http://localhost:1235/v1', format: 'openai-chatv2' },
}

export const CUSTOM_PROVIDERS: Record<string, ProviderDefinition> = {
  'openai-chatv2': { name: 'OpenAI Compatible (Chat)', format: 'openai-chatv2' },
  'openai-chat': { name: 'OpenAI Compatible (Chat - Legacy)', format: 'openai-chat' },
  openai: { name: 'OpenAI (Completions)', format: 'openai' },
}
