import { v4 } from 'uuid'
import { AppSchema } from '../../../srv/db/schema'
import { ImportCharacter } from '../../pages/Character/ImportCharacter'
import { api, isLoggedIn } from '../api'
import { NewCharacter } from '../character'
import { loadItem, local } from './storage'

export async function getCharacters() {
  if (isLoggedIn()) {
    const res = await api.get('/character')
    return res
  }

  const characters = local.loadItem('characters')
  return { result: { characters }, error: undefined }
}

export async function deleteCharacter(charId: string) {
  if (isLoggedIn()) {
    const res = api.method('delete', `/character/${charId}`)
    return res
  }

  const chars = loadItem('characters')
  const chats = loadItem('chats')

  const next = {
    chars: chars.filter((ch) => ch._id !== charId),
    chats: chats.filter((ch) => {
      if (ch.characterId !== charId) return true
      local.deleteChatMessages(ch._id)
      return false
    }),
  }

  local.saveChars(next.chars)
  local.saveChats(next.chats)

  return { result: true, error: undefined }
}

export async function editChracter(charId: string, { avatar: file, ...char }: NewCharacter) {
  if (isLoggedIn()) {
    const form = new FormData()
    form.append('name', char.name)
    form.append('greeting', char.greeting)
    form.append('scenario', char.scenario)
    form.append('persona', JSON.stringify(char.persona))
    form.append('sampleChat', char.sampleChat)
    if (file) {
      form.append('avatar', file)
    }

    const res = await api.upload(`/character/${charId}`, form)
    return res
  }

  const avatar = await getImageData(file)
  const chars = loadItem('characters')
  const prev = chars.find((ch) => ch._id === charId)

  if (!prev) {
    return { result: undefined, error: `Character not found` }
  }

  const nextChar = { ...prev, ...char, avatar: avatar || prev.avatar }
  const next = chars.map((ch) => (ch._id === charId ? nextChar : ch))
  local.saveChars(next)

  return { result: nextChar, error: undefined }
}

export async function createCharacter(char: ImportCharacter) {
  if (isLoggedIn()) {
    const form = new FormData()
    form.append('name', char.name)
    form.append('greeting', char.greeting)
    form.append('scenario', char.scenario)
    form.append('persona', JSON.stringify(char.persona))
    form.append('sampleChat', char.sampleChat)
    if (char.avatar) {
      form.append('avatar', char.avatar)
    }

    const res = await api.upload<AppSchema.Character>(`/character`, form)
    return res
  }

  const { avatar: file, ...props } = char
  const avatar = file ? await getImageData(file) : undefined
  const newChar: AppSchema.Character = { ...props, ...baseChar(), avatar, _id: v4() }

  const chars = loadItem('characters')
  const next = chars.concat(newChar)
  local.saveChars(next)

  return { result: newChar, error: undefined }
}

export async function getImageData(file?: File) {
  if (!file) return
  const reader = new FileReader()

  return new Promise<string>((resolve, reject) => {
    reader.readAsDataURL(file)

    reader.onload = (evt) => {
      if (!evt.target?.result) return reject(new Error(`Failed to process image`))
      resolve(evt.target.result.toString())
    }
  })
}

export async function getImageBuffer(file?: File) {
  if (!file) return
  const reader = new FileReader()

  return new Promise<Buffer>((resolve, reject) => {
    reader.readAsArrayBuffer(file)

    reader.onload = (evt) => {
      if (!evt.target?.result) return reject(new Error(`Failed to process image`))
      resolve(Buffer.from(evt.target.result as ArrayBuffer))
    }
  })
}

function baseChar() {
  return {
    userId: local.ID,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    kind: 'character' as const,
  }
}
