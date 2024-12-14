import * as horde from '../../../common/horde-gen'
import { createImagePrompt, getMaxImageContext } from '../../../common/image-prompt'
import { api } from '../api'
import { getStore } from '../create'
import { msgsApi } from './messages'
import { AIAdapter } from '/common/adapters'
import { decode, encode, getEncoder } from '/common/tokenize'
import { parseTemplate } from '/common/template-parser'
import { neat, wait } from '/common/util'
import { AppSchema } from '/common/types'
import { localApi } from './storage'
import { subscribe } from '../socket'
import { getAssetUrl } from '/web/shared/util'
import { v4 } from 'uuid'
import { md5 } from './md5'
import { getPromptEntities, PromptEntities } from './common'
import { genApi } from './inference'

type GenerateOpts = {
  chatId?: string
  ephemeral?: boolean
  messageId?: string
  prompt?: string
  append?: boolean
  source: string
  parent?: string

  /** If true, the Image Settings prefix and suffix won't be applied */
  noAffix?: boolean
  onDone: (image: string) => void
}

export const ALLOWED_TYPES = new Map([
  ['jpg', 'image/jpeg'],
  ['jpeg', 'image/jpeg'],
  ['png', 'image/png'],
  ['apng', 'image/apng'],
  ['gif', 'image/gif'],
])

export const imageApi = {
  generateImage,
  generateImageWithPrompt,
  generateImageAsync,
  dataURLtoFile,
  getImageData,
  ALLOWED_TYPES,
}

export async function generateImage({ chatId, messageId, onDone, ...opts }: GenerateOpts) {
  const entities = await getPromptEntities()
  const summary = opts.prompt
    ? await localApi.result({ response: opts.prompt })
    : await createSummarizedImagePrompt(entities)

  if (!summary.result) {
    return summary
  }

  const prompt = summary.result.response

  const characterId = entities.messages.reduceRight((id, msg) => id || msg.characterId)

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
    chatId,
    characterId,
    parent: opts.parent,
  })
  return res
}

export async function generateImageWithPrompt(opts: {
  prompt: string
  source: string
  onDone: (result: { image: string; file: File; data?: string }) => void
  onTick?: (status: horde.HordeCheck) => void
}) {
  const { prompt, source, onDone } = opts
  const user = getStore('user').getState().user

  if (!user) {
    throw new Error('Could not get user settings')
  }

  if (!user.images || user.images.type === 'horde') {
    try {
      const { text: image } = await horde.generateImage(
        user,
        prompt,
        user.images?.negative || horde.defaults.image.negative,
        (status) => {
          opts.onTick?.(status)
        }
      )

      const file = await dataURLtoFile(image)
      const data = await getImageData(file)

      onDone({ image, file, data })
      return localApi.result({})
    } catch (ex: any) {
      return localApi.error(ex.message)
    }
  }

  const res = await api.post<{ success: boolean; requestId: string }>(`/character/image`, {
    prompt,
    user,
    ephemeral: true,
    source,
  })

  return res
}

export type ImageResult = { image: string; file: File; data?: string; error?: string }

export async function generateImageAsync(
  prompt: string,
  opts: {
    model?: string
    requestId?: string
    noAffix?: boolean
    onTick?: (status: horde.HordeCheck) => void
    onDone?: (result: { image: string; file: File; data?: string; error?: string }) => void
  } = {}
): Promise<ImageResult> {
  const user = getStore('user').getState().user
  const source = `image-${v4()}`

  if (!user) {
    throw new Error('Could not get user settings')
  }

  if (!user.images || user.images.type === 'horde') {
    try {
      const { text: image } = await horde.generateImage(
        user,
        prompt,
        user.images?.negative || '',
        (status) => {
          opts.onTick?.(status)
        }
      )

      const file = await dataURLtoFile(image)
      const data = await getImageData(file)

      opts.onDone?.({ image, file, data })

      return { image, file, data }
    } catch (ex: any) {
      throw ex
    }
  }

  const requestId = opts.requestId || v4()

  const promise = new Promise<ImageResult>((resolve, reject) => {
    callbacks.set(requestId, (image) => {
      opts.onDone?.(image)
      if (image.error) return reject(new Error(image.error))
      resolve(image)
    })
  })

  await api.post<{ success: boolean }>(`/character/image`, {
    prompt,
    user,
    ephemeral: true,
    source,
    noAffix: opts.noAffix,
    model: opts.model,
    requestId,
  })

  return promise
}

const callbacks = new Map<string, (result: ImageResult) => void>()

subscribe(
  'image-generated',
  { image: 'string', requestId: 'string', source: 'string?' },
  async (body) => {
    if (body.source === 'avatar') return

    const callback = callbacks.get(body.requestId)
    if (!callback) return

    callbacks.delete(body.requestId)
    const url = getAssetUrl(body.image)

    try {
      const image = await tryFetchImage(getAssetUrl(body.image))
      const file = new File([image], `${body.source}.png`, { type: 'image/png' })

      const hash = md5(await image.text())
      Object.assign(file, { hash })

      const data = await getImageData(file)

      callback({ image: url, file, data })
    } catch (ex) {
      callback({ error: 'Failed to download image', image: '', file: null as any })
    }
  }
)

async function tryFetchImage(image: string, attempt = 1) {
  if (attempt > 10) throw new Error(`failed to download image`)

  try {
    const res = await fetch(getAssetUrl(image), {
      cache: 'no-cache',
    })
    if (res.status && res.status > 200) {
      await wait(3)
      return tryFetchImage(image, attempt + 1)
    }

    return res.blob()
  } catch (ex) {
    return tryFetchImage(image, attempt + 1)
  }
}

subscribe('image-failed', { requestId: 'string', error: 'string' }, (body) => {
  const callback = callbacks.get(body.requestId)
  if (!callback) return

  callback({ file: {} as any, image: '', error: body.error })
})

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
  const handler = opts.settings?.service
    ? SUMMARY_BACKENDS[opts.settings?.service]
    : (_opts: any) => false

  const canUseService = handler?.(opts) ?? false
  if (canUseService && opts.user.images?.summariseChat) {
    console.log('Using', opts.settings?.service, 'to summarise')

    const summary = await getChatSummary(opts.settings, opts.user.images?.summaryPrompt)
    console.log('Image caption: ', summary)
    return summary
  }

  const prompt = await createImagePrompt(opts)
  return localApi.result({ response: prompt, meta: {} })
}

async function getChatSummary(settings: Partial<AppSchema.GenSettings>, summaryPrompt?: string) {
  const opts = await msgsApi.getActiveTemplateParts()
  opts.limit = {
    context: 1024,
    encoder: await getEncoder(),
  }
  opts.lines = (opts.lines || []).reverse()

  let template = getSummaryTemplate(settings.service!, summaryPrompt)

  if (!template) throw new Error(`No chat summary template available for "${settings.service!}"`)

  const parsed = await parseTemplate(template, opts)
  const prompt = parsed.parsed
  const response = await genApi.basicInference({
    prompt,
    settings,
  })

  return response
}

function getSummaryTemplate(service: AIAdapter, summaryPrompt?: string) {
  switch (service) {
    case 'novel': {
      const prompt =
        summaryPrompt ||
        `Write a detailed image caption of the current scene with a description of each character's appearance`
      return neat`
      {{char}}'s personality: {{personality}}
      [ Style: chat ]
      ***
      {{history}}
      { ${prompt} }`
    }

    case 'openai':
    case 'openrouter':
    case 'claude':
    case 'scale': {
      const prompt =
        summaryPrompt ||
        `Write an image caption of the current scene including the character's appearance`
      return neat`
      {{personality}}
      
      (System note: Start of conversation)
      {{history}}
      
      {{ujb}}
      (System: ${prompt})
      Image caption:`
    }

    case 'ooba':
    case 'kobold':
    case 'agnaistic': {
      const prompt =
        summaryPrompt ||
        `Write an image caption of the current scene using physical descriptions without names.`
      return neat`
      <system>Below is an instruction that describes a task. Write a response that completes the request.</system>

      {{char}}'s Persona: {{personality}}

      The scenario of the conversation: {{scenario}}

      Then the roleplay chat begins.
  
      {{#each msg}}{{#if .isbot}}<bot>{{.name}}: {{.msg}}</bot>{{/if}}{{#if .isuser}}<user>{{.name}}: {{.msg}}</user>{{/if}}
      {{/each}}

      <user>${prompt}</user>

      <bot>Image caption:`
    }
  }
}

export async function dataURLtoFile(base64: string, name?: string): Promise<File> {
  return fetch(base64)
    .then((res) => res.blob())
    .then(async (buf) => {
      const file = new File([buf], name || 'avatar.png', { type: 'image/png' })
      return file
    })
}

/**
 * Returns image base64
 * @param file
 * @param name
 * @returns
 */
export async function getImageData(file: File | Blob | string | undefined, name?: string) {
  if (!file) return

  if (typeof file === 'string') {
    const image = await fetch(getAssetUrl(file)).then((res) => res.blob())
    const ext = file.split('.').slice(-1)[0]
    const mimetype = ALLOWED_TYPES.get(ext) || 'image/png'
    file = new File([image], name || 'downloaded.png', { type: mimetype })
  }

  const reader = new FileReader()

  return new Promise<string>((resolve, reject) => {
    reader.readAsDataURL(file as File | Blob)

    reader.onload = (evt) => {
      if (!evt.target?.result) return reject(new Error(`Failed to process image`))
      resolve(evt.target.result.toString())
    }
  })
}
