import * as horde from '../../../common/horde-gen'
import { createImagePrompt, getMaxImageContext } from '../../../common/image-prompt'
import { api, isLoggedIn } from '../api'
import { getStore } from '../create'
import { subscribe } from '../socket'
import { PromptEntities, getPromptEntities, msgsApi } from './messages'
import { AIAdapter, NOVEL_MODELS } from '/common/adapters'
import { decode, encode } from '/common/tokenize'

type GenerateOpts = {
  chatId?: string
  ephemeral?: boolean
  messageId?: string
  prompt?: string
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

  if (!isLoggedIn()) {
    const image = await horde.generateImage(entities.user, trimmed)
    onDone(image)
  }

  const res = await api.post<{ success: boolean }>(`/chat/${chatId || entities.chat._id}/image`, {
    prompt: trimmed,
    user: entities.user,
    messageId,
    ephemeral: opts.ephemeral,
  })
  return res
}

export async function generateImageWithPrompt(prompt: string, onDone: (image: string) => void) {
  const user = getStore('user').getState().user

  if (!user) {
    throw new Error('Could not get user settings')
  }

  if (!isLoggedIn()) {
    const image = await horde.generateImage(user, prompt)
    onDone(image)
  }

  const res = await api.post<{ success: boolean }>(`/character/image`, {
    prompt,
    user,
    ephemeral: true,
  })
  return res
}

const SUMMARY_BACKENDS: { [key in AIAdapter]?: (opts: PromptEntities) => boolean } = {
  openai: () => true,
  novel: (opts) => opts.user.novelModel === NOVEL_MODELS.clio_v1,
}

async function createSummarizedImagePrompt(opts: PromptEntities) {
  const handler = opts.settings?.service
    ? SUMMARY_BACKENDS[opts.settings?.service]
    : (_opts: any) => false

  const canUseService = handler?.(opts) ?? false
  if (canUseService && opts.user.images?.summariseChat) {
    console.log('Using', opts.settings?.service, 'to summarise')
    msgsApi.generateResponseV2({ kind: 'summary' })

    return new Promise<string>((resolve, reject) => {
      let timer = setTimeout(() => {
        reject(new Error(`Chat summarisation timed out`))
      }, 45000)
      subscribe(
        'chat-summary',
        { chatId: 'string', summary: 'string' },
        (body) => {
          clearTimeout(timer)
          resolve(body.summary)
        },
        true
      )
    })
  }

  const prompt = await createImagePrompt(opts)
  return prompt
}
