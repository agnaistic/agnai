import * as horde from '../../../common/horde-gen'
import { createImagePrompt } from '../../../common/image-prompt'
import { api, isLoggedIn } from '../api'
import { subscribe } from '../socket'
import { PromptEntities, getPromptEntities, msgsApi } from './messages'
import { AIAdapter } from '/common/adapters'

type GenerateOpts = {
  chatId?: string
  ephemeral?: boolean
  messageId?: string
  prompt?: string
  onDone: (image: string) => void
}

export const imageApi = {
  generateImage,
}

export async function generateImage({ chatId, messageId, onDone, ...opts }: GenerateOpts) {
  const entities = await getPromptEntities()
  const prompt = opts.prompt ? opts.prompt : await createSummarizedImagePrompt(entities)

  if (!isLoggedIn()) {
    const image = await horde.generateImage(entities.user, prompt)
    onDone(image)
  }

  const res = await api.post<{ success: boolean }>(`/chat/${chatId || entities.chat._id}/image`, {
    prompt,
    user: entities.user,
    messageId,
    ephemeral: opts.ephemeral,
  })
  return res
}

const SUMMARY_BACKENDS: { [key in AIAdapter]?: boolean } = {
  openai: true,
}

async function createSummarizedImagePrompt(opts: PromptEntities) {
  if (opts.settings?.service! in SUMMARY_BACKENDS && opts.user.images?.summariseChat) {
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
