import { v4 } from 'uuid'
import { AppSchema } from '../../../common/types/schema'
import { api, isLoggedIn } from '../api'
import { NewCharacter, UpdateCharacter } from '../character'
import { loadItem, localApi } from './storage'
import { appendFormOptional, strictAppendFormOptional } from '/web/shared/util'
import { getImageData } from './image'
import { replace } from '/common/util'

export const charsApi = {
  getCharacterDetail,
  getMultipleDetails,
  getCharacters,
  removeAvatar,
  editAvatar,
  deleteCharacter,
  editCharacter,
  editPartialCharacter,
  createCharacter,
  getImageBuffer: getFileBuffer,
  setFavorite,
  editMany,
}

async function editMany(
  characterIds: string[],
  action: { type: 'delete' | 'archive' | 'add-tag' | 'remove-tag' | 'folder'; value?: string }
) {
  if (isLoggedIn()) {
    const payload: any = { characterIds }

    switch (action.type) {
      case 'delete': {
        payload.delete = true
        break
      }

      case 'add-tag': {
        payload.addTag = action.value
        break
      }

      case 'remove-tag': {
        payload.removeTag = action.value
        break
      }

      case 'archive': {
        payload.archive = true
        break
      }

      case 'folder': {
        payload.folder = payload.value
        break
      }
    }

    const res = await api.post('/character/bulk-update', payload)
    return res
  }

  const allChars = await loadItem('characters')

  const ids = new Set(characterIds)

  if (action.type === 'delete') {
    const next = allChars.filter((ch) => !ids.has(ch._id))
    await localApi.saveChars(next)

    return localApi.result({ characters: [] })
  }

  const handler =
    action.type === 'add-tag'
      ? addTag
      : action.type === 'remove-tag'
      ? removeTag
      : action.type === 'archive'
      ? addTag
      : setFolder

  const value =
    action.type === 'add-tag' || action.type === 'remove-tag' || action.type === 'folder'
      ? action.value!
      : 'archived'

  const next = allChars.map((ch) => {
    if (!ids.has(ch._id)) return ch
    return handler(ch, value)
  })

  await localApi.saveChars(next)
  return localApi.result({ characters: next })
}

function addTag(ch: AppSchema.Character, value: string) {
  if (!ch.tags) {
    return { ...ch, tags: [value] }
  }

  if (ch.tags.includes(value)) return ch
  return { ...ch, tags: ch.tags.concat(value) }
}

function removeTag(ch: AppSchema.Character, value: string) {
  if (!ch.tags) return { ...ch, tags: [] }
  if (!ch.tags.includes(value)) return ch

  const set = new Set(ch.tags)
  set.delete(value)

  return { ...ch, tags: Array.from(set) }
}

function setFolder(ch: AppSchema.Character, value: string) {
  return { ...ch, folder: value }
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

async function getMultipleDetails(charIds: string[]) {
  if (isLoggedIn()) {
    const res = await api.post(`/character/multiple`, { characterIds: charIds })
    if (res.result) {
      return localApi.result(res.result.characters)
    }

    return res
  }

  const ids = new Set(charIds)
  const chars = await loadItem('characters').then((list) =>
    list.filter((item) => ids.has(item._id))
  )

  return localApi.result(chars)
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
  char: UpdateCharacter,
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

    if (char.avatar) {
      appendFormOptional(form, 'avatar', char.avatar)
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

  const avatar = char.avatar ? await getImageData(char.avatar) : undefined
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
