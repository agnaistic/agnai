import { ImageAdapterResponse, ImageGenerateRequest } from './types'
import { AppLog } from '../middleware'
import { handleNovelImage } from './novel'
import { store } from '../db'
import { config } from '../config'
import { v4 } from 'uuid'
import { saveFile } from '../api/upload'
import { handleSDImage, handleSwarmImage } from './stable-diffusion'
import { sendGuest, sendMany, sendOne } from '../api/ws'
import { handleHordeImage } from './horde'
import { AppSchema } from '/common/types'
import { BaseImageSettings, ImageProviderSettings } from '/common/types/image-schema'
import { getImagePrompt, getImageSettings } from '/common/image'
import { StatusError } from '../api/wrap'

const DEFAULT_NEGATIVE = ``

export async function generateImageSync(opts: ImageGenerateRequest, log: AppLog) {
  const imageSettings = opts.user.images
  const { prompt, rawPrompt } = getImagePrompt(opts, imageSettings)
  opts.raw_prompt = rawPrompt

  const id = opts.user.imageProviderId || opts.user.images?.type || 'horde'
  let provider = opts.user.imageProviders?.find((i) => i._id === id)

  if (!provider) {
    const type = opts.user.images?.type || 'horde'
    provider = opts.user.images?.[type] as any
  }

  if (!provider) {
    throw new StatusError('Cannot locate Image Provider settings', 500)
  }

  let { error, image } = await runImageGenerate({
    imageSettings,
    provider,
    user: opts.user,
    prompt,
    log,
    guestId: undefined,
    opts,
  })

  return { error, image, output: image?.content }
}

export async function generateImage(opts: ImageGenerateRequest, log: AppLog, guestId?: string) {
  const { user, chatId, messageId } = opts
  const broadcastIds: string[] = []

  const chat = chatId ? await store.chats.getChatOnly(chatId) : undefined
  const characterId =
    chat?.imageSource === 'main-character'
      ? chat.characterId
      : chat?.imageSource === 'last-character'
      ? opts.characterId
      : undefined
  const character =
    chat && characterId ? await store.characters.getCharacter(chat.userId, characterId) : undefined

  if (!guestId) {
    broadcastIds.push(user._id)
    if (chatId) {
      const members = await store.chats.getActiveMembers(chatId)
      broadcastIds.push(...members, user._id)
    }
  }

  const { settings: imageSettings, provider } = getImageSettings(chat, character, user)

  if (!provider) {
    throw new StatusError('Cannot locate Image Provider', 500)
  }

  const { prompt, rawPrompt } = getImagePrompt(opts, imageSettings)
  opts.raw_prompt = rawPrompt

  log.debug({ prompt, type: imageSettings?.type, source: chat?.imageSource }, 'Image prompt')

  if (!guestId && !opts.sync) {
    sendOne(user._id, {
      type: 'image-generation-started',
      prompt,
      negative: imageSettings?.negative || '',
      service: imageSettings?.type,
      requestId: opts.requestId,
    })
  }

  let { image, output, error } = await runImageGenerate({
    imageSettings,
    provider,
    user,
    prompt,
    log,
    guestId,
    opts,
  })

  /**
   * If the server is configured to save images: we will store the image, generate a message, then publish the message
   * Otherwise: We will broadcast the image content
   */

  if (image) {
    // Guest images do not get saved under any circumstances

    if (typeof image.content === 'string' && image.content.startsWith('http')) {
      output = image.content
    }

    if (guestId) {
      if (!output) {
        output = `data:image/png;base64,${image.content.toString('base64')}`
      }
    } else if (!opts.ephemeral && config.storage.saveImages) {
      const name = `${v4()}.${image.ext}`

      if (!output) {
        output = await saveFile(name, image.content)
      }

      if (!guestId && chatId) {
        const msg = await updateMessageImages({
          chatId,
          userId: user._id,
          filename: output,
          memberIds: broadcastIds,
          messageId: messageId || opts.parentId!,
          imagePrompt: opts.prompt,
          append: opts.append,
          meta: { negative: imageSettings?.negative },
        })

        if (msg) return { output }
      }
    } else {
      output = output || (await saveFile(`temp-${v4()}.${image.ext}`, image.content, 300))
    }
  }

  // If we are generating temporary images, persist the prompt to avoid re-generating the prompt for subsequent images
  if (image && !guestId && messageId) {
    const edited = await store.msgs.editMessage(messageId, { imagePrompt: opts.prompt })
    sendMany(broadcastIds, {
      type: 'message-edited',
      chatId,
      messageId,
      message: edited?.msg,
      imagePrompt: opts.prompt,
    })
  }

  if (!image && !error) {
    error = 'Invalid image settings (No handler found)'
  }

  const message = image
    ? {
        type: 'image-generated',
        chatId,
        messageId: messageId || opts.parentId,
        image: output,
        source: opts.source,
        requestId: opts.requestId,
      }
    : {
        type: 'image-failed',
        chatId,
        error,
        requestId: opts.requestId,
      }

  if (!opts.sync) {
    if (broadcastIds.length) {
      sendMany(broadcastIds, message)
    } else if (guestId) {
      sendGuest(guestId, message)
    }
  }

  return { output, error }
}

async function runImageGenerate(options: {
  imageSettings: BaseImageSettings | undefined
  provider: ImageProviderSettings
  user: AppSchema.User
  prompt: string
  log: AppLog
  guestId: string | undefined
  opts: ImageGenerateRequest
}) {
  const { imageSettings, user, prompt, log, guestId, opts, provider } = options

  let image: ImageAdapterResponse | undefined
  let output: string = ''
  let error: any

  const negative = imageSettings?.negative || DEFAULT_NEGATIVE

  try {
    switch (provider.type) {
      case 'swarm': {
        image = await handleSwarmImage(
          {
            user,
            prompt,
            negative,
            settings: imageSettings,
            provider,
            override: opts.model,
            params: opts.params,
            raw_prompt: opts.prompt,
          },
          log,
          guestId
        )
        break
      }

      case 'novel':
        image = await handleNovelImage(
          {
            user,
            prompt,
            negative,
            settings: imageSettings,
            provider,
            params: opts.params,
            raw_prompt: opts.prompt,
          },
          log,
          guestId
        )
        break

      case 'sd':
      case 'agnai':
      case 'openai':
        image = await handleSDImage(
          {
            user,
            prompt,
            negative,
            settings: imageSettings,
            provider,
            override: opts.model,
            params: opts.params,
            raw_prompt: opts.prompt,
          },
          log,
          guestId
        )
        break

      case 'horde':
      default:
        image = await handleHordeImage(
          {
            user,
            prompt,
            negative,
            settings: imageSettings,
            provider,
            params: opts.params,
            raw_prompt: opts.prompt,
          },
          log,
          guestId
        )
        break
    }
  } catch (ex: any) {
    log.error(
      { err: ex, body: ex.body },
      `[${imageSettings?.type || 'default'}] Image generation failed `
    )

    error = `Request failed: ${ex.message || ex}`
  }

  return { image, output, error }
}

async function updateMessageImages(opts: {
  chatId: string
  userId: string
  filename: string
  messageId: string
  memberIds: string[]
  imagePrompt: string
  append?: boolean
  meta?: any
}) {
  const chat = opts.chatId ? await store.chats.getChatOnly(opts.chatId) : undefined
  if (!chat) return

  const char = await store.characters.getCharacter(chat.userId, chat.characterId)
  if (!char) return

  const messageId = opts.messageId
  const original = await store.msgs.getMessage(messageId)
  if (!original) return

  const extras = (original?.extras || []).concat(opts.filename)

  const msg = await store.msgs.editMessage(messageId, {
    imagePrompt: opts.imagePrompt,
    extras,
    meta: opts.meta,
  })
  sendMany(opts.memberIds, {
    type: 'message-edited',
    chatId: opts.chatId,
    messageId,
    extras,
    imagePrompt: opts.imagePrompt,
  })
  return msg
}
