import * as horde from '../../../common/horde-gen'
import { createImagePrompt, getMaxImageContext } from '../../../common/image-prompt'
import { api, isLoggedIn } from '../api'
import { getStore } from '../create'
import { PromptEntities, getPromptEntities, msgsApi } from './messages'
import { AIAdapter } from '/common/adapters'
import { decode, encode, getEncoder } from '/common/tokenize'
import { parseTemplate } from '/common/template-parser'
import { neat } from '/common/util'
import { AppSchema } from '/common/types'
import { localApi } from './storage'

type GenerateOpts = {
  chatId?: string
  ephemeral?: boolean
  messageId?: string
  prompt?: string
  append?: boolean
  source: string
  onDone: (image: string) => void
}

export const imageApi = {
  generateImage,
  generateImageWithPrompt,
}

export async function generateImage({ chatId, messageId, onDone, ...opts }: GenerateOpts) {
  const entities = await getPromptEntities()
  const prompt = opts.prompt ? opts.prompt : await createSummarizedImagePrompt(entities)

  const max = getMaxImageContext(entities.user)
  const trimmed = await encode(prompt)
    .then((tokens) => tokens.slice(0, max))
    .then(decode)

  const res = await api.post<{ success: boolean }>(`/chat/${chatId || entities.chat._id}/image`, {
    prompt: trimmed,
    user: entities.user,
    messageId,
    ephemeral: opts.ephemeral,
    append: opts.append,
    source: opts.source,
  })
  return res
}

export async function generateImageWithPrompt(
  prompt: string,
  source: string,
  onDone: (image: string) => void
) {
  const user = getStore('user').getState().user

  if (!user) {
    throw new Error('Could not get user settings')
  }

  if (!isLoggedIn() && (!user.images || user.images.type === 'horde')) {
    try {
      const { text: image } = await horde.generateImage(
        user,
        prompt,
        user.images?.negative || horde.defaults.image.negative
      )
      onDone(image)
      return localApi.result({})
    } catch (ex: any) {
      return localApi.error(ex.message)
    }
  }

  const res = await api.post<{ success: boolean }>(`/character/image`, {
    prompt,
    user,
    ephemeral: true,
    source,
  })

  return res
}

const SUMMARY_BACKENDS: { [key in AIAdapter]?: (opts: PromptEntities) => boolean } = {
  openai: () => true,
  novel: () => true,
  ooba: () => true,
  kobold: () => true,
  openrouter: () => true,
  claude: () => true,
  mancer: () => true,
  agnaistic: () => true,
}

async function createSummarizedImagePrompt(opts: PromptEntities) {
  // if (opts.user?.useLocalPipeline && pipelineApi.isAvailable().summary) {
  //   const { prompt } = await msgsApi.createActiveChatPrompt({ kind: 'summary' }, 2048)
  //   console.log('Using local summarization')
  //   const res = await pipelineApi.summarize(prompt.template.parsed)
  //   if (res?.result) return res.result.summary
  // }

  const handler = opts.settings?.service
    ? SUMMARY_BACKENDS[opts.settings?.service]
    : (_opts: any) => false

  const canUseService = handler?.(opts) ?? false
  if (canUseService && opts.user.images?.summariseChat) {
    console.log('Using', opts.settings?.service, 'to summarise')

    const summary = await getChatSummary(opts.settings)
    console.log('Image caption: ', summary)
    return summary
  }

  const prompt = await createImagePrompt(opts)
  return prompt
}

async function getChatSummary(settings: Partial<AppSchema.GenSettings>) {
  const opts = await msgsApi.getActiveTemplateParts()
  opts.limit = {
    context: 1024,
    encoder: await getEncoder(),
  }
  opts.lines = (opts.lines || []).reverse()

  const template = getSummaryTemplate(settings.service!)
  if (!template) throw new Error(`No chat summary template available for "${settings.service!}"`)

  const parsed = await parseTemplate(template, opts)
  const prompt = parsed.parsed
  const values = await msgsApi.guidance<{ summary: string }>({
    prompt,
    settings,
    service: settings.service,
  })
  return values.summary
}

function getSummaryTemplate(service: AIAdapter) {
  switch (service) {
    case 'novel':
      return neat`
      {{char}}'s personality: {{personality}}
      [ Style: chat ]
      ***
      {{history}}
      { Write a detailed image caption of the current scene with a description of each character's appearance }
      [summary | tokens=250]
      `

    case 'openai':
    case 'openrouter':
    case 'claude':
    case 'scale':
      return neat`
              {{personality}}
              
              (System note: Start of conversation)
              {{history}}
              
              {{ujb}}
              (System: Write an image caption of the current scene including the character's appearance)
              Image caption: [summary]
              `

    case 'ooba':
    case 'kobold':
    case 'agnaistic':
      return neat`
      Below is an instruction that describes a task. Write a response that completes the request.

      {{char}}'s Persona: {{personality}}

      The scenario of the conversation: {{scenario}}

      Then the roleplay chat between {{#each bot}}{{.name}}, {{/each}}{{char}} begins.
  
      {{#each msg}}{{#if .isbot}}### Response:\n{{.name}}: {{.msg}}{{/if}}{{#if .isuser}}### Instruction:\n{{.name}}: {{.msg}}{{/if}}
      {{/each}}

      ### Instruction:
      Write an image caption of the current scene using physical descriptions without names.

      ### Response:
      Image caption: [summary | tokens=250]
      `
  }
}
