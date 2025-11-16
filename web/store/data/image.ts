import * as horde from '../../../common/horde-gen'
import { getMaxImageContext } from '../../../common/image-prompt'
import { api } from '../api'
import { getStore } from '../create'
import { decode, encode } from '/common/tokenize'
import { neat, wait } from '/common/util'
import { AppSchema } from '/common/types'
import { localApi } from './storage'
import { localEmit, subscribe } from '../socket'
import { getAssetUrl } from '/web/shared/util'
import { v4 } from 'uuid'
import { md5 } from './md5'
import { getImagePromptEntities, getPromptEntities } from './common'
import { inferenceHelper } from './inference'
import { TickHandler } from '/common/prompt'
import { extractReasoning } from '/common/reasoning'
import { swarmApi } from '/common/requests/swarmui'
import { ImageRequestOpts } from '/srv/image/types'
import { getImagePrompt, getImageSettings } from '/common/image'
import { imageStore } from '../images'
import { isChatPage } from '/web/shared/hooks'
import { FileInputResult } from '/web/shared/FileInput'

export type ImageRequestEntities = Awaited<ReturnType<typeof createImageRequest>>

type GenerateOpts = {
  chatId?: string
  ephemeral?: boolean
  messageId?: string
  prompt?: string
  append?: boolean
  source: string
  parent?: string
  question?: string
  signal?: AbortController

  /** If true, the Image Settings prefix and suffix won't be applied */
  noAffix?: boolean
}

export const ALLOWED_TYPES = new Map([
  ['jpg', 'image/jpeg'],
  ['jpeg', 'image/jpeg'],
  ['png', 'image/png'],
  ['apng', 'image/apng'],
  ['gif', 'image/gif'],
  ['webp', 'image/webp'],
])

export function getImageType(image: string) {
  for (const [ext, _mimetype] of ALLOWED_TYPES.entries()) {
    if (image.toLowerCase().endsWith(`.${ext}`)) return { type: 'url' as const, image }
  }

  return { type: 'base64' as const, image }
}

export const imageApi = {
  generateImage,
  generateImagePrompt,
  generateImageAsync,
  getSummaryTemplate,
  dataURLtoFile,
  getImageData,
  getSDModelList,
  getImageModelList,
  getImageBase64,
  processBase64,
  asyncImage,
  processImageFile,
  ALLOWED_TYPES,
}

async function processImageFile(file: File): Promise<FileInputResult> {
  const buf = await file.arrayBuffer()
  const buffer = Buffer.from(buf)
  const base64 = `data:${file.type};base64,${buffer.toString('base64')}`

  return {
    file,
    content: base64,
  }
}
export async function generateImagePrompt(opts: {
  onTick?: TickHandler
  question?: string
  messageId?: string
  signal?: AbortController
}) {
  const imgEnts = await getImagePromptEntities(opts.messageId)
  const helper = inferenceHelper({ preset: imgEnts.preset, onTick: opts.onTick })
  const template = getSummaryTemplate({
    preset: imgEnts.preset,
    summaryPrompt: imgEnts.summary,
    question: opts.question,
  })
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
    const loras = await swarmApi.getModelList(opts.url, 'LoRA')
    return { ...models, loras: loras.models }
  }

  const res = await api.post<{ models: SDModel[] }>('/chat/image-models', opts)
  if (res.result) {
    return res.result
  }

  return { models: [] }
}

export async function generateImage(
  opts: GenerateOpts,
  callbacks?: { onSummary?: (summary: string) => void; onTick?: TickHandler }
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

  callbacks?.onSummary?.(summary)

  const max = getMaxImageContext(entities.user)
  const trimmed = await encode(summary)
    .then((tokens) => tokens.slice(0, max))
    .then(decode)

  const req = await createImageRequest({ prompt: trimmed, messageId: opts.messageId })
  const requestId = v4()

  try {
    const image = await dispatchImage(req, opts, requestId)

    const payload = {
      type: 'image-generated',
      chatId: opts.chatId,
      messageId: opts.messageId,
      image: image.content,
      requestId,
      source: opts.source,
      summary,
    }

    localEmit(payload)
    return localApi.result({ ...image, summary, messageId: opts.messageId, requestId })
  } catch (ex: any) {
    localEmit({ type: 'image-error', error: ex?.message || ex })
    return localApi.error(ex?.message || ex)
  }
}

async function dispatchImage(req: ImageRequestEntities, opts: GenerateOpts, requestId: string) {
  if (req.provider?.type === 'horde') {
    try {
      const { text: image } = await horde.generateImage(
        req.entities.user,
        req.request.prompt,
        req.request.negative,
        (status) => {}
      )

      const file = await dataURLtoFile(image)
      const buffer = await file.arrayBuffer()
      const data = await getImageData(file)

      return { buffer, file, content: data }
    } catch (ex: any) {
      throw ex
    }
  }

  if (req.provider?.local && req.provider.type === 'swarm') {
    const signal = opts.signal || new AbortController()
    imageStore.setState({ signal })

    const result = await swarmApi.generateImageWS(req.request, {
      signal,
      onDone: () => imageStore.setState({ preview: undefined }),
      onError: () => imageStore.setState({ preview: undefined }),
      onPreview: (step) => imageStore.setState({ preview: step }),
    })

    return result
  }

  const res = await api.post<{ success: boolean; output?: string; error?: string }>(
    `/chat/${opts.chatId}/image`,
    {
      sync: true,
      prompt: req.request.prompt,
      messageId: opts.messageId,
      ephemeral: opts.ephemeral,
      append: opts.append,
      source: opts.source,
      chatId: opts.chatId,
      characterId: req.entities.message?.characterId,
      parent: opts.parent,
      requestId,
      user: req.entities.user,
    }
  )

  if (res.error) {
    throw new Error(res.error)
  }

  if (!res.result?.output) {
    const msg = res.result?.error || `Image generation failed to return a result`
    throw new Error(msg)
  }

  const base64 = await imageApi.getImageBase64(res.result.output)
  const proc = imageApi.processBase64(base64)

  const buffer = await proc.file.arrayBuffer()
  return { content: base64, file: proc.file, buffer }
}

export type ImageResult = { image: string; file: File; data?: string; error?: string }

export async function generateImageAsync(
  prompt: string,
  opts: {
    chatId?: string
    messageId?: string
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

  const req = await createImageRequest({ prompt, noAffix: opts.noAffix, messageId: opts.messageId })
  const requestId = opts.requestId || v4()

  const image = await dispatchImage(
    req,
    {
      source,
      noAffix: opts.noAffix,
      ephemeral: true,
      chatId: opts.chatId,
      messageId: opts.messageId,
    },
    requestId
  )

  const payload = {
    type: 'image-generated',
    chatId: opts.chatId,
    messageId: opts.messageId,
    image: image.content,
    requestId,
    source,
  }

  localEmit(payload)
  opts.onDone?.({ file: image.file, image: image.content!, data: image.content })

  const result: ImageResult = {
    file: image.file,
    image: image.content!,
    data: image.content!,
  }

  return result

  // if (req.provider?.type === 'horde') {
  //   try {
  //     const { text: image } = await horde.generateImage(
  //       user,
  //       prompt,
  //       user.images?.negative || '',
  //       (status) => {
  //         opts.onTick?.(status)
  //       }
  //     )

  //     const file = await dataURLtoFile(image)
  //     const data = await getImageData(file)

  //     opts.onDone?.({ image, file, data })

  //     return { image, file, data }
  //   } catch (ex: any) {
  //     throw ex
  //   }
  // }

  // if (req.provider?.local && req.provider.type === 'swarm') {
  //   const signal = new AbortController()

  //   imageStore.setState({ signal })

  //   const res = await swarmApi.generateImageWS(req.request, {
  //     signal,
  //     onDone: () => imageStore.setState({ preview: undefined }),
  //     onError: () => imageStore.setState({ preview: undefined }),
  //     onPreview: (step) => imageStore.setState({ preview: step }),
  //   })
  //   opts.onDone?.({ file: res.file, image: res.content, data: res.content })
  //   return {
  //     image: res.content,
  //     file: res.file,
  //     data: res.content,
  //   }
  // }

  // const res = await api.post<{ success: boolean; output?: string }>(`/character/image`, {
  //   sync: true,
  //   prompt,
  //   user,
  //   ephemeral: true,
  //   source,
  //   noAffix: opts.noAffix,
  //   model: opts.model,
  //   requestId,
  // })

  // if (res.result?.output) {
  //   const type = getImageType(res.result.output)
  //   const base64 = type.type === 'url' ? await getImageBase64(res.result.output) : type.image
  //   const proc = processBase64(base64)

  //   const result: ImageResult = {
  //     file: proc.file,
  //     image: base64,
  //     data: res.result.output,
  //   }

  //   return result
  // }

  // if (res.error) {
  //   throw new Error(res.error)
  // }

  // throw new Error(`Image generation failed: Empty result`)
}

export async function getImageBase64(image: string) {
  if (image.startsWith('data:')) return image

  if (!image.startsWith('http')) {
    image = getAssetUrl(image)
  }

  const base64 = await imageApi.getImageData(image)
  return base64!
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

function getSummaryTemplate(opts: {
  preset: Partial<AppSchema.GenSettings> | undefined
  summaryPrompt: string | undefined
  question?: string
}) {
  let prompt =
    opts.summaryPrompt ||
    neat`Write an image caption of the current scene using physical descriptions without names. Respond using comma-separate BOORU TAGS.`

  if (opts?.question) {
    prompt += `\nSpecifically focus on: ${opts.question}`
  }

  return neat`
      <system>Your task is to generate an Image Caption in the format that is specified by the user using the details of the conversation below at the current moment in the roleplay scenario.
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

export function asyncImage(src: string) {
  return new Promise<{ name: string; image: HTMLImageElement }>(async (resolve, reject) => {
    const data = await getImageBase64(src)
    const image = new Image()
    image.setAttribute('crossorigin', 'anonymous')
    image.src = data

    image.onload = () => resolve({ name: src, image })
    image.onerror = (ev) => reject(ev)
  })
}

export function processBase64(base64: string) {
  const full = base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`
  const blob = new Blob([full])
  const file = new File([blob], `image_${Date.now()}.png`, { type: 'image/png' })
  return { base64: full, file }
}

export async function createImageRequest(input: {
  prompt: string
  messageId?: string
  noAffix?: boolean
}) {
  const ents = await getImageEntities()
  const { user } = getStore('user').getState()
  const { settings, provider } = getImageSettings(ents.chat, ents.char, ents.user)
  const { rawPrompt, prompt } = getImagePrompt(input, settings)

  const opts: ImageRequestOpts = {
    negative: settings?.negative || '',
    prompt,
    raw_prompt: rawPrompt,
    settings,
    user: user!,
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

  return { request: opts, settings, provider, entities: ents }
}

function getImageEntities(messageId?: string) {
  const { user } = getStore('user').getState()
  const { details, lastChatId } = getStore('chat').getState()
  const { graph } = getStore('messages').getState()
  const active = details[lastChatId]
  const isChat = isChatPage()

  const message = messageId ? graph.tree[messageId]?.msg : undefined

  return {
    user: user!,
    chat: isChat ? active?.chat : undefined,
    char: isChat ? active?.char : undefined,
    message,
  }
}
