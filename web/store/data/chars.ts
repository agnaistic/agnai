import { v4 } from 'uuid'
import { AppSchema } from '../../../common/types/schema'
import { api, isLoggedIn } from '../api'
import { NewCharacter, UpdateCharacter } from '../character'
import { loadItem, localApi } from './storage'
import { appendFormOptional, strictAppendFormOptional } from '/web/shared/util'
import { getImageData } from './image'
import { replace } from '/common/util'
import { TickHandler } from '/common/prompt'
import { rootModalStore } from '../root-modal'
import { genApi } from './inference'

export const charsApi = {
  getCharacterDetail,
  getCharacters,
  removeAvatar,
  editAvatar,
  deleteCharacter,
  editCharacter,
  editPartialCharacter,
  createCharacter,
  getImageBuffer: getFileBuffer,
  setFavorite,
  publishCharacter,
}

async function getCharacterDetail(charId: string) {
  if (isLoggedIn()) {
    const res = await api.get(`/character/${charId}`)
    return res
  }

  const chars = await loadItem('characters')
  const char = chars.find((ch) => ch._id === charId)

  if (char) {
    return localApi.result(char)
  } else {
    return localApi.error(`Character not found`)
  }
}

async function publishCharacter(
  char: Partial<AppSchema.Character>,
  image: string | undefined,
  onTick: TickHandler
) {
  const requestId = v4()

  genApi.subscribe(requestId, (body, state, output) => {
    onTick(body, state, output)
    const info = Object.entries(output).reduce((prev, [key, value]) => {
      prev.push(`\`${key}\`\n${value}`)
      return prev
    }, [] as string[])

    rootModalStore.info('Moderation', info.join('\n***\n'))
  })

  const res = await api.post('/character/publish', { character: char, imageData: image, requestId })
  return res
}

export async function getCharacters() {
  if (isLoggedIn()) {
    const res = await api.get('/character')
    return res
  }

  const characters = await localApi.loadItem('characters')
  const result = characters.map((ch) => ({
    _id: ch._id,
    name: ch.name,
    description: ch.description,
    tags: ch.tags,
    avatar: ch.avatar,
    favorite: ch.favorite,
    userId: ch.userId,
    createdAt: ch.createdAt,
    updatedAt: ch.updatedAt,
  }))
  return localApi.result({ characters: result })
}

export async function removeAvatar(charId: string) {
  if (isLoggedIn()) {
    const res = await api.method('delete', `/character/${charId}/avatar`)
    return res
  }

  const chars = await loadItem('characters').then((res) =>
    res.map((ch) => {
      if (ch._id !== charId) return ch
      return { ...ch, avatar: '' }
    })
  )

  await localApi.saveChars(chars)
  return localApi.result(chars.filter((ch) => ch._id === charId))
}

export async function editAvatar(charId: string, file: File) {
  if (isLoggedIn()) {
    const form = new FormData()
    form.append('avatar', file)

    const res = await api.upload(`/character/${charId}`, form)
    return res
  }

  const avatar = await getImageData(file)
  const chars = await loadItem('characters')

  const prev = chars.find((ch) => ch._id === charId)

  if (!prev) {
    return { result: undefined, error: `Character not found` }
  }

  const nextChar = { ...prev, avatar: avatar || prev.avatar }
  const next = chars.map((ch) => (ch._id === charId ? nextChar : ch))
  await localApi.saveChars(next)

  return localApi.result(nextChar)
}

export async function deleteCharacter(charId: string) {
  if (isLoggedIn()) {
    const res = api.method('delete', `/character/${charId}`)
    return res
  }

  const chars = await loadItem('characters')
  const chats = await loadItem('chats')

  const next = {
    chars: chars.filter((ch) => ch._id !== charId),
    chats: chats.filter((ch) => {
      if (ch.characterId !== charId) return true
      localApi.deleteChatMessages(ch._id)
      return false
    }),
  }

  await localApi.saveChars(next.chars)
  await localApi.saveChats(next.chats)

  return { result: true, error: undefined }
}

export async function editPartialCharacter(charId: string, update: Partial<AppSchema.Character>) {
  if (isLoggedIn()) {
    const res = await api.post<AppSchema.Character>(`/character/${charId}/update`, update)
    return res
  }

  const chars = await loadItem('characters')
  const next = replace(charId, chars, update)

  const nextChar = next.find((ch) => ch._id === charId)

  if (!nextChar) {
    return localApi.error(`Character update failed: Character not found`)
  }

  await localApi.saveChars(next)
  return localApi.result(nextChar)
}

export async function editCharacter(
  charId: string,
  { avatar: file, ...char }: UpdateCharacter,
  previous?: AppSchema.Character
) {
  if (isLoggedIn()) {
    const form = new FormData()
    appendFormOptional(form, 'name', char.name)
    strictAppendFormOptional(form, 'greeting', char.greeting)
    strictAppendFormOptional(form, 'scenario', char.scenario)
    appendFormOptional(form, 'appearance', char.appearance)
    appendFormOptional(form, 'persona', JSON.stringify(char.persona))
    strictAppendFormOptional(form, 'description', char.description || '')
    appendFormOptional(form, 'culture', char.culture)
    appendFormOptional(form, 'tags', char.tags || [], JSON.stringify)
    strictAppendFormOptional(form, 'sampleChat', char.sampleChat)
    appendFormOptional(form, 'voice', JSON.stringify(char.voice))
    appendFormOptional(form, 'json', JSON.stringify(char.json))

    if (file) {
      appendFormOptional(form, 'avatar', file)
    }

    appendFormOptional(form, 'visualType', char.visualType)
    appendFormOptional(form, 'sprite', JSON.stringify(char.sprite))
    appendFormOptional(form, 'imageSettings', JSON.stringify(char.imageSettings))

    // v2 fields start here
    appendFormOptional(form, 'alternateGreetings', char.alternateGreetings, JSON.stringify)
    appendFormOptional(form, 'characterBook', char.characterBook, JSON.stringify)
    appendFormOptional(form, 'extensions', char.extensions, JSON.stringify)
    appendFormOptional(form, 'insert', char.insert, JSON.stringify)
    strictAppendFormOptional(form, 'systemPrompt', char.systemPrompt)
    strictAppendFormOptional(form, 'postHistoryInstructions', char.postHistoryInstructions)
    strictAppendFormOptional(form, 'creator', char.creator)
    strictAppendFormOptional(form, 'characterVersion', char.characterVersion)
    appendFormOptional(form, 'voiceDisabled', char.voiceDisabled)

    const res = await api.upload(`/character/${charId}`, form)
    return res
  }

  const avatar = file ? await getImageData(file) : undefined
  const chars = await loadItem('characters')
  const prev = chars.find((ch) => ch._id === charId)

  if (!prev) {
    return { result: undefined, error: `Character not found` }
  }

  const nextChar = { ...prev, ...char, avatar: avatar || prev.avatar }
  const next = chars.map((ch) => (ch._id === charId ? nextChar : ch))
  await localApi.saveChars(next)

  return { result: nextChar, error: undefined }
}

export async function setFavorite(charId: string, favorite: boolean) {
  if (isLoggedIn()) {
    const res = await api.post(`/character/${charId}/favorite`, { favorite: favorite })
    return res
  }

  const chars = await loadItem('characters')
  const prev = chars.find((ch) => ch._id === charId)

  if (!prev) {
    return { result: undefined, error: `Character not found` }
  }

  const nextChar = { ...prev, favorite: favorite }
  const next = chars.map((ch) => (ch._id === charId ? nextChar : ch))
  await localApi.saveChars(next)

  return { result: nextChar, error: undefined }
}

export async function createCharacter(char: NewCharacter) {
  if (isLoggedIn()) {
    const form = new FormData()
    form.append('name', char.name)
    form.append('greeting', char.greeting)
    form.append('scenario', char.scenario)
    form.append('sampleChat', char.sampleChat)
    appendFormOptional(form, 'persona', char.persona, JSON.stringify)
    appendFormOptional(form, 'description', char.description)
    appendFormOptional(form, 'appearance', char.appearance)
    appendFormOptional(form, 'culture', char.culture)
    appendFormOptional(form, 'voice', char.voice, JSON.stringify)
    appendFormOptional(form, 'tags', char.tags, JSON.stringify)
    appendFormOptional(form, 'avatar', char.avatar)
    appendFormOptional(form, 'originalAvatar', char.originalAvatar)
    appendFormOptional(form, 'visualType', char.visualType)
    appendFormOptional(form, 'sprite', JSON.stringify(char.sprite))
    appendFormOptional(form, 'imageSettings', JSON.stringify(char.imageSettings))
    appendFormOptional(form, 'json', JSON.stringify(char.json))

    // v2 fields start here
    appendFormOptional(form, 'alternateGreetings', char.alternateGreetings, JSON.stringify)
    appendFormOptional(form, 'characterBook', char.characterBook, JSON.stringify)
    appendFormOptional(form, 'extensions', char.extensions, JSON.stringify)
    appendFormOptional(form, 'insert', char.insert, JSON.stringify)
    appendFormOptional(form, 'systemPrompt', char.systemPrompt)
    appendFormOptional(form, 'postHistoryInstructions', char.postHistoryInstructions)
    appendFormOptional(form, 'creator', char.creator)
    appendFormOptional(form, 'characterVersion', char.characterVersion)
    appendFormOptional(form, 'voiceDisabled', char.voiceDisabled)
    const res = await api.upload<AppSchema.Character>(`/character`, form)
    return res
  }

  const { avatar: file, ...props } = char
  const avatar = file
    ? await getImageData(file)
    : char.originalAvatar
    ? char.originalAvatar
    : undefined

  const newChar: AppSchema.Character = { ...props, ...baseChar(), avatar, _id: v4() }

  const chars = await loadItem('characters')
  const next = chars.concat(newChar)
  await localApi.saveChars(next)

  return { result: newChar, error: undefined }
}

export async function getFileBuffer(file?: File) {
  if (!file) return
  const reader = new FileReader()

  return new Promise<Buffer>((resolve, reject) => {
    reader.readAsArrayBuffer(file)

    reader.onload = (evt) => {
      if (!evt.target?.result) return reject(new Error(`Failed to process file`))
      resolve(Buffer.from(evt.target.result as ArrayBuffer))
    }
  })
}

function baseChar() {
  return {
    userId: localApi.ID,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    kind: 'character' as const,
  }
}
