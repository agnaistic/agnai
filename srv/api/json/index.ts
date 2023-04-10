import { Router } from 'express'
import { readFile, writeFile } from 'fs/promises'
import { resolve } from 'path'
import { handle } from '../wrap'
import { getAppConfig } from '../settings'
import { v4 } from 'uuid'
import { saveBase64File } from '../upload'
import { config } from '../../config'

const names = {
  user: 'user.json',
  profile: 'profile.json',
  presets: 'presets.json',
  memory: 'books.json',
  characters: 'characters.json',
  chats: 'chats.json',
}

const loadState = handle(async (req) => {
  const [user, profile, presets, books, characters, chats] = await Promise.all([
    read(names.user),
    read(names.profile),
    read(names.presets),
    read(names.memory),
    read(names.characters),
    read(names.chats),
  ])

  const config = await getAppConfig()

  return {
    profile,
    user,
    presets,
    config,
    books,
    characters,
    chats,
  }
})

const loadCharacters = handle(async () => {
  const characters = await read(names.characters)
  return characters || []
})

const saveCharacters = handle(async ({ body }) => {
  await saveFile(names.characters, body)
  return { success: true }
})

const saveState = handle(async ({ body }) => {
  if (body.user || body.config) await saveFile(names.user, body.user || body.config)
  if (body.books || body.memory) await saveFile(names.memory, body.books || body.memory)
  if (body.profile) await saveFile(names.profile, body.profile)
  if (body.characters) await saveFile(names.characters, body.characters)
  if (body.presets) await saveFile(names.presets, body.presets)
  if (body.chats) await saveFile(names.chats, body.chats)

  return { success: true }
})

const loadMessages = handle(async ({ params }) => {
  const messages = await read(`messages-${params.id}.json`)
  if (!messages) return []
  return messages
})

const saveMessages = handle(async ({ params, body }) => {
  const id = params.id
  const name = `messages-${id}.json`
  await saveFile(name, body)
  return { success: true }
})

const router = Router()

router.get('/', loadState)
router.get('/chracters', loadCharacters)
router.get('/messages/:id', loadMessages)

router.post('/', saveState)
router.post('/characters', saveCharacters)
router.post('/messages/:id', saveMessages)

export default router

async function read(file: string) {
  const content = await readFile(resolve(config.jsonFolder, file)).catch(() => null)
  if (!content) return
  try {
    const json = JSON.parse(content.toString())
    return json
  } catch (ex) {}
}

async function saveFile(file: string, content: any) {
  if (Array.isArray(content)) {
    for (const ent of content) {
      if (!ent.avatar) continue
      ent.avatar = await saveAvatar(ent.avatar)
    }
  } else if (content && content.avatar) {
    content.avatar = await saveAvatar(content.avatar)
  }

  await writeFile(
    resolve(config.jsonFolder, file),
    typeof content === 'string' ? content : JSON.stringify(content, null, 2)
  )
}

async function saveAvatar(avatar: string) {
  const ext = avatar.includes('image/png')
    ? '.png'
    : avatar.includes('image/jpeg')
    ? '.jpeg'
    : avatar.includes('jpg')
    ? '.jpg'
    : null

  if (!ext) {
    return avatar
  }

  const data = avatar.replace(/^data:image\/([a-z0-9]+);base64,/, '')
  const filename = `${v4()}${ext}`

  const outname = await saveBase64File(filename, data)
  return outname
}
