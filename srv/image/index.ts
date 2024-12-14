import { ImageAdapterResponse, ImageGenerateRequest } from './types'
import { AppLog } from '../middleware'
import { handleNovelImage } from './novel'
import { store } from '../db'
import { config } from '../config'
import { v4 } from 'uuid'
import { saveFile } from '../api/upload'
import { handleSDImage } from './stable-diffusion'
import { sendGuest, sendMany, sendOne } from '../api/ws'
import { handleHordeImage } from './horde'
import { AppSchema } from '/common/types'
import { ImageSettings } from '/common/types/image-schema'

const DEFAULT_NEGATIVE = ``

export async function generateImageSync(opts: ImageGenerateRequest, log: AppLog) {
  const imageSettings = opts.user.images
  const prompt = getImagePrompt(opts, imageSettings)

  let { error, image } = await runImageGenerate({
    imageSettings,
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

  const imageSettings = getImageSettings(chat, character, user)
  const prompt = getImagePrompt(opts, imageSettings)

  log.debug({ prompt, type: imageSettings?.type, source: chat?.imageSource }, 'Image prompt')

  if (!guestId) {
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
        const msg = await createImageMessage({
          chatId,
          userId: user._id,
          filename: output,
          memberIds: broadcastIds,
          messageId,
          imagePrompt: opts.prompt,
          append: opts.append,
          meta: { negative: imageSettings?.negative },
          parentId: opts.parentId,
        })

        if (msg) return
      }
    } else {
      output = output || (await saveFile(`temp-${v4()}.${image.ext}`, image.content, 300))
    }
  }

  const message = image
    ? {
        type: 'image-generated',
        chatId,
        image: output,
        source: opts.source,
        requestId: opts.requestId,
      }
    : {
        type: 'image-failed',
        chatId,
        error: error || 'Invalid image settings (No handler found)',
        requestId: opts.requestId,
      }

  if (broadcastIds.length) {
    sendMany(broadcastIds, message)
  } else if (guestId) {
    sendGuest(guestId, message)
  }

  return { output }
}

async function runImageGenerate(options: {
  imageSettings: ImageSettings | undefined
  user: AppSchema.User
  prompt: string
  log: AppLog
  guestId: string | undefined
  opts: ImageGenerateRequest
}) {
  const { imageSettings, user, prompt, log, guestId, opts } = options

  let image: ImageAdapterResponse | undefined
  let output: string = ''
  let error: any

  const negative = imageSettings?.negative || DEFAULT_NEGATIVE

  try {
    switch (imageSettings?.type || 'horde') {
      case 'novel':
        image = await handleNovelImage(
          {
            user,
            prompt,
            negative,
            settings: imageSettings,
            params: opts.params,
            raw_prompt: opts.prompt,
          },
          log,
          guestId
        )
        break

      case 'sd':
      case 'agnai':
        image = await handleSDImage(
          {
            user,
            prompt,
            negative,
            settings: imageSettings,
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
    error = ex.message || ex
  }

  return { image, output, error }
}

function getImagePrompt(opts: ImageGenerateRequest, imageSettings: ImageSettings | undefined) {
  let parsed = opts.prompt.replace(/\{\{prompt\}\}/g, ' ')
  let prompt = parsed

  if (imageSettings?.template) {
    prompt = imageSettings.template.replace(/\{\{prompt\}\}/g, parsed)
    if (!prompt.includes(parsed)) {
      prompt = prompt + ' ' + parsed
    }
  }

  prompt = prompt.trim()
  opts.raw_prompt = prompt

  if (!opts.noAffix) {
    const parts = [prompt]
    if (imageSettings?.prefix) {
      parts.unshift(imageSettings.prefix)
    }

    if (imageSettings?.suffix) {
      parts.push(imageSettings.suffix)
    }

    prompt = parts
      .join(', ')
      .split(',')
      .filter((p) => !!p.trim())
      .join(', ')
      .replace(/,+/g, ',')
      .replace(/ +/g, ' ')
  }

  return prompt
}

function getImageSettings(
  chat: AppSchema.Chat | null | undefined,
  character: AppSchema.Character | undefined,
  user: AppSchema.User
) {
  let imageSettings =
    chat?.imageSource === 'main-character' || chat?.imageSource === 'last-character'
      ? character?.imageSettings
      : chat?.imageSource === 'chat'
      ? chat?.imageSettings
      : user.images

  if (!imageSettings) {
    imageSettings = user.images
  }
  return imageSettings
}

async function createImageMessage(opts: {
  chatId: string
  userId: string
  filename: string
  messageId?: string
  memberIds: string[]
  imagePrompt: string
  append?: boolean
  meta?: any
  parentId: string | undefined
}) {
  const chat = opts.chatId ? await store.chats.getChatOnly(opts.chatId) : undefined
  if (!chat) return

  const char = await store.characters.getCharacter(chat.userId, chat.characterId)
  if (!char) return

  if (opts.messageId && !opts.append) {
    const msg = await store.msgs.editMessage(opts.messageId, {
      msg: opts.filename,
      adapter: 'image',
      meta: opts.meta,
    })
    sendMany(opts.memberIds, {
      type: 'message-retry',
      chatId: opts.chatId,
      messageId: opts.messageId,
      message: opts.filename,
      adapter: 'image',
    })
    return msg
  } else if (opts.messageId && opts.append) {
    const prev = await store.msgs.getMessage(opts.messageId)
    const extras = prev?.extras || []
    extras.push(opts.filename)
    await store.msgs.editMessage(opts.messageId, { adapter: 'image', extras })
    sendMany(opts.memberIds, {
      type: 'message-retry',
      chatId: opts.chatId,
      messageId: opts.messageId,
      message: prev?.msg || '',
      extras,
      adapter: 'image',
    })
    if (prev) prev.extras = extras
    return prev
  } else {
    const msg = await store.msgs.createChatMessage({
      chatId: opts.chatId!,
      message: opts.filename,
      characterId: char._id,
      adapter: 'image',
      ooc: false,
      imagePrompt: opts.imagePrompt,
      event: undefined,
      meta: opts.meta,
      parent: opts.parentId,
      name: char.name,
    })

    sendMany(opts.memberIds, { type: 'message-created', msg, chatId: opts.chatId })
    return msg
  }
}
