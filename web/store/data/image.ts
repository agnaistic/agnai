import * as horde from '../../../common/horde-gen'
import { getMaxImageContext } from '../../../common/image-prompt'
import { api } from '../api'
import { getStore } from '../create'
import { msgsApi } from './messages'
import { decode, encode, getEncoder } from '/common/tokenize'
import { parseTemplate } from '/common/template-parser'
import { neat, wait } from '/common/util'
import { AppSchema } from '/common/types'
import { localApi } from './storage'
import { localEmit, subscribe } from '../socket'
import { getAssetUrl } from '/web/shared/util'
import { v4 } from 'uuid'
import { md5 } from './md5'
import { getImagePromptEntities, getPromptEntities } from './common'
import { genApi, inferenceHelper } from './inference'
import { TickHandler } from '/common/prompt'
import { extractReasoning } from '/common/reasoning'
import { replaceTags } from '/common/presets/templates'
import { toastStore } from '../toasts'
import { swarmApi } from '/common/requests/swarmui'
import { ImageRequestOpts } from '/srv/image/types'
import { getImagePrompt, getImageSettings } from '/common/image'
import { imageStore } from '../images'

type GenerateOpts = {
  chatId?: string
  ephemeral?: boolean
  messageId?: string
  prompt?: string
  append?: boolean
  source: string
  parent?: string
  question?: string

  /** If true, the Image Settings prefix and suffix won't be applied */
  noAffix?: boolean
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
  generateImagePrompt,
  generateImageWithPrompt,
  generateImageAsync,
  getSummaryTemplate,
  getChatSummary,
  dataURLtoFile,
  getImageData,
  getSDModelList,
  getImageModelList,
  ALLOWED_TYPES,
}

export async function generateImagePrompt(opts: {
  onTick?: TickHandler
  question?: string
  messageId?: string
  signal?: AbortController
}) {
  const imgEnts = await getImagePromptEntities(opts.messageId)
  const helper = inferenceHelper({ preset: imgEnts.preset, onTick: opts.onTick })
  const template = getSummaryTemplate({ preset: imgEnts.preset, question: opts.question })
  const settings = imgEnts.preset || imgEnts.entities.settings

  console.log(
    'Using',
    settings.service,
    'to summarise:',
    settings.name || '',
    `\n${imgEnts.summary || ''}`
  )

  const stream = await helper.send({ prompt: template, preset: settings, signal: opts.signal })
  const result = await stream.promise

  if (result.result?.response) {
    const { content } = extractReasoning(result.result.response)
    if (content) {
      result.result.response = content
    }
  }

  const summary = result?.result?.response

  console.log('Image caption: ', summary)
  return result
}

const SD_MODEL_CACHE = new Map<string, SDModel[]>()

type SDModel = { title: string; model_name: string; filename: string }

export async function getSDModelList(
  opts: { url: string; key?: string; providerId?: string },
  force?: boolean
) {
  if (!force && SD_MODEL_CACHE.has(opts.url)) {
    const models = SD_MODEL_CACHE.get(opts.url)!
    return { models }
  }

  const res = await api.post<{ models: SDModel[] }>('/chat/sd-models', opts)
  if (res.result) {
    return res.result
  }

  return { models: [] }
}

export async function getImageModelList(opts: {
  type: 'sd' | 'swarm'
  url: string
  key?: string
  local?: boolean
  providerId?: string
}) {
  if (opts.type === 'swarm' && opts.local) {
    const models = await swarmApi.getModelList(opts.url)
    return models
  }

  const res = await api.post<{ models: SDModel[] }>('/chat/image-models', opts)
  if (res.result) {
    return res.result
  }

  return { models: [] }
}

export async function generateImage(
  opts: GenerateOpts,
  callbacks?: { onDone?: (summary: string) => void; onTick?: TickHandler }
) {
  const entities = await getPromptEntities({ messageId: opts.messageId })
  const result = opts.prompt
    ? await localApi.result({ response: opts.prompt })
    : await generateImagePrompt({
        messageId: opts.messageId,
        onTick: callbacks?.onTick,
        question: opts.question,
      })

  if (result.error || !result.result) {
    return localApi.error(result.error)
  }

  const summary = result.result.response

  callbacks?.onDone?.(result.result?.response)

  const characterId = entities.messages.reduceRight((id, msg) => id || msg.characterId)

  const max = getMaxImageContext(entities.user)
  const trimmed = await encode(summary)
    .then((tokens) => tokens.slice(0, max))
    .then(decode)

  const req = await createImageRequest({ prompt: trimmed, messageId: opts.messageId })

  if (req.provider?.local && req.provider.type === 'swarm') {
    swarmApi
      .generateImageWS(req.request, {
        onDone: () => imageStore.setState({ preview: undefined }),
        onError: () => imageStore.setState({ preview: undefined }),
        onPreview: (step) => imageStore.setState({ preview: step }),
      })
      .then((res) => {
        const result = {
          type: 'image-generated',
          chatId: opts.chatId,
          messageId: opts.messageId,
          image: res.content,
          requestId: v4(),
          source: opts.source,
          summary,
        }
        localEmit(result)
      })

    return localApi.result({ success: true, summary })
  }

  const res = await api.post<{ success: boolean }>(
    `/chat/${opts.chatId || entities.chat._id}/image`,
    {
      prompt: trimmed,
      user: entities.user,
      messageId: opts.messageId,
      ephemeral: opts.ephemeral,
      append: opts.append,
      source: opts.source,
      chatId: opts.chatId,
      characterId,
      parent: opts.parent,
      requestId: v4(),
    }
  )

  return localApi.result({ success: res.result?.success, summary })
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

  const req = await createImageRequest({ prompt, noAffix: opts.noAffix })

  if (req.provider?.type === 'horde') {
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

  if (req.provider?.local && req.provider.type === 'swarm') {
    const signal = new AbortController()

    imageStore.setState({ signal })

    const res = await swarmApi.generateImageWS(req.request, {
      signal,
      onDone: () => imageStore.setState({ preview: undefined }),
      onError: () => imageStore.setState({ preview: undefined }),
      onPreview: (step) => imageStore.setState({ preview: step }),
    })
    opts.onDone?.({ file: res.file, image: res.content, data: res.content })
    return {
      image: res.content,
      file: res.file,
      data: res.content,
    }
  }

  const promise = new Promise<ImageResult>((resolve, reject) => {
    callbacks.set(requestId, (image) => {
      opts.onDone?.(image)
      if (image.error) {
        toastStore.error(image.error)
        return reject(new Error(image.error))
      }
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

async function getChatSummary(
  settings: Partial<AppSchema.GenSettings>,
  params: {
    prompt: string
    question?: string
    onTick?: TickHandler
    signal?: AbortController
  }
) {
  const active = await msgsApi.getActiveTemplateParts()
  active.limit = {
    context: settings.maxContextLength!,
    encoder: await getEncoder(),
  }

  const template = getSummaryTemplate({
    preset: settings,
    question: params.question,
  })

  if (!template) throw new Error(`No chat summary template available for "${settings.service!}"`)

  const parsed = await parseTemplate(template, active)

  let prompt = parsed.parsed
  prompt = replaceTags(prompt, settings.modelFormat || 'None')

  const response = await genApi.inferenceStream(
    {
      prompt,
      settings,
      messages: parsed.blocks,
      signal: params.signal,
    },
    (text, state) => {
      if (!params.onTick) return
      const { content } = extractReasoning(text)
      params.onTick?.(content.trim(), state)
    }
  )

  return response
}

function getSummaryTemplate(opts: {
  preset: Partial<AppSchema.GenSettings> | undefined
  question?: string
}) {
  let prompt =
    opts?.preset?.imageSettings?.summaryPrompt ||
    neat`Write an image caption of the current scene using physical descriptions without names. Respond using comma-separate BOORU TAGS.`

  if (opts?.question) {
    prompt += `\nSpecifically focus on: ${opts.question}`
  }

  return neat`
      <system>Your task is to generate an Image Caption using only Comma-separated List of Booru Tags by summarizing the most recent moment in a roleplay scenario.
      Generate an image caption using the details and conversation below.</system>

      <instruct>
      {{char}}'s Persona: {{personality}}

      The scenario of the conversation: {{scenario}}

      Then the roleplay chat begins.</instruct>
  
      {{#each msg}}{{#if .isbot}}<bot>{{.name}}: {{.msg}}</bot>{{/if}}{{#if .isuser}}<user>{{.name}}: {{.msg}}</user>{{/if}}
      {{/each}}

      <instruct>${prompt}</instruct>

      <assistant>Image caption:</assistant>`
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

export async function createImageRequest(input: {
  prompt: string
  messageId?: string
  noAffix?: boolean
}) {
  const ents = await getPromptEntities({ messageId: input.messageId })
  const { settings, provider } = getImageSettings(ents.chat, ents.char, ents.user)
  const { rawPrompt, prompt } = getImagePrompt(input, settings)

  const opts: ImageRequestOpts = {
    negative: settings?.negative || '',
    prompt,
    raw_prompt: rawPrompt,
    settings,
    user: ents.user,
    override: '',
    params: {
      cfg_scale: settings?.cfg,
      clip_skip: settings?.clipSkip,
      height: settings?.height,
      negative: settings?.negative || '',
      seed: settings?.seed ?? -1,
      steps: settings?.steps,
      width: settings?.width,
    },
  }

  if (!opts.params?.width || !opts.params.height) {
    opts.params!.width = 1024
    opts.params!.height = 1024
  }

  return { request: opts, settings, provider }
}
