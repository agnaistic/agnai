import { ImageAdapterResponse, ImageGenerateRequest } from './types'
import { AppLog } from '../logger'
import { handleNovelImage } from './novel'
import { store } from '../db'
import { config } from '../config'
import { v4 } from 'uuid'
import { saveFile } from '../api/upload'
import { handleSDImage } from './stable-diffusion'
import { sendGuest, sendMany, sendOne } from '../api/ws'
import { handleHordeImage } from './horde'

const DEFAULT_NEGATIVE = `disfigured, deformed, poorly, blurry, lowres, fused, malformed, misshapen, duplicated, grainy, distorted`

export async function generateImage(
  { user, chatId, messageId, ...opts }: ImageGenerateRequest,
  log: AppLog,
  guestId?: string
) {
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

  let image: ImageAdapterResponse | undefined
  let output: string = ''
  let error: any

  let parsed = opts.prompt.replace(/\{\{prompt\}\}/g, ' ')
  let prompt = parsed

  let imageSettings =
    chat?.imageSource === 'main-character' || chat?.imageSource === 'last-character'
      ? character?.imageSettings
      : chat?.imageSource === 'chat'
      ? chat?.imageSettings
      : user.images

  if (!imageSettings) {
    imageSettings = user.images
  }

  if (imageSettings?.template) {
    prompt = imageSettings.template.replace(/\{\{prompt\}\}/g, parsed)
    if (!prompt.includes(parsed)) {
      prompt = prompt + ' ' + parsed
    }
  }

  prompt = prompt.trim()

  if (!opts.noAffix) {
    const parts = [prompt]
    if (imageSettings?.prefix) {
      parts.unshift(imageSettings.prefix)
    }

    if (imageSettings?.suffix) {
      parts.push(imageSettings.suffix)
    }

    prompt = parts.join(', ').replace(/,+/g, ',').replace(/ +/g, ' ')
  }

  log.debug({ prompt, type: imageSettings?.type, source: chat?.imageSource }, 'Image prompt')
  const negative = imageSettings?.negative || DEFAULT_NEGATIVE

  if (!guestId) {
    sendOne(user._id, {
      type: 'image-generation-started',
      prompt,
      negative,
      service: imageSettings?.type,
    })
  }

  try {
    switch (imageSettings?.type || 'horde') {
      case 'novel':
        image = await handleNovelImage({ user, prompt, negative }, log, guestId)
        break

      case 'sd':
      case 'agnai':
        image = await handleSDImage({ user, prompt, negative }, log, guestId)
        break

      case 'horde':
      default:
        image = await handleHordeImage({ user, prompt, negative }, log, guestId)
        break
    }
  } catch (ex: any) {
    error = ex.message || ex
  }

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
        output = `data:image/image;base64,${image.content.toString('base64')}`
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
          meta: { negative },
        })

        if (msg) return
      }
    } else {
      output = output || (await saveFile(`temp-${v4()}.${image.ext}`, image.content, 300))
    }
  }

  const message = image
    ? { type: 'image-generated', chatId, image: output, source: opts.source }
    : { type: 'image-failed', chatId, error: error || 'Invalid image settings (No handler found)' }

  if (broadcastIds.length) {
    sendMany(broadcastIds, message)
  } else if (guestId) {
    sendGuest(guestId, message)
  }

  return { output }
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
    })

    sendMany(opts.memberIds, { type: 'message-created', msg, chatId: opts.chatId })
    return msg
  }
}
