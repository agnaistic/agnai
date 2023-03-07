import { v4 } from 'uuid'
import { AIAdapter, NOVEL_MODELS } from '../../common/adapters'
import { AppSchema } from '../../srv/db/schema'
import { createStore } from './create'
import { toastStore } from './toasts'
import type { ImportCharacter } from '../pages/Character/ImportCharacter'
import type { NewCharacter } from './character'

const KEYS = {
  char: 'characters',
  profile: 'profile',
  messages: 'messages',
  config: 'config',
}

const defaultConfig: GuestConfig = {
  novelApiKey: '',
  novelModel: NOVEL_MODELS.euterpe,
  hordeKey: '',
  hordeModel: 'PygmalionAI/pygmalion-6b',
  defaultAdapter: 'horde',
  koboldUrl: '',
  luminaiUrl: '',
}

const STARTER_CHARACTER: GuestCharacter = {
  _id: v4(),
  name: 'Robot',
  persona: {
    kind: 'boostyle',
    attributes: {
      species: ['human'],
      mind: ['kind', 'compassionate', 'caring', 'tender', 'forgiving'],
      personality: ['kind', 'compassionate', 'caring', 'tender', 'forgiving'],
      job: ['therapist'],
    },
  },
  sampleChat:
    '{{user}}: Something has been troubling me this week.\r\n{{char}}: *I appear genuinely concerned* What is troubling you?',
  scenario:
    "Robot is in their office. You knock on the door and Robot beckons you inside. You open the door and enter Robot's office.",
  greeting:
    "*A soft smile appears on my face as I see you enter the room* Hello! It's good to see you again. Please have a seat! What is on your mind today?",
}

const defaultProfile: GuestProfile = { handle: 'You' }

export const guestStore = createStore<GuestState>(
  'guest',
  init()
)((_) => ({
  saveConfig(state, config: Partial<GuestConfig>) {
    const next = { ...state.config, ...config }
    localStorage.setItem(KEYS.config, JSON.stringify(next))
    toastStore.success('Saved configuration')
    return { config: next }
  },
  async saveProfile(state, handle: string, file?: File) {
    const avatar = await getImageData(file)
    const next = { handle, avatar: avatar || state.profile.avatar }
    localStorage.setItem(KEYS.profile, JSON.stringify(next))
    toastStore.success('Saved profile')
    return { profile: next }
  },
  async createCharacter(state, char: ImportCharacter) {
    const { avatar: file, ...props } = char
    const avatar = await getImageData(file)
    const newChar: GuestCharacter = { ...props, avatar, _id: v4() }
    const next = state.chars.concat(newChar)
    localStorage.setItem(KEYS.char, JSON.stringify(next))
    return { chars: next }
  },
  deleteCharacter(state, charId: string) {
    const next = state.chars.filter((ch) => ch._id !== charId)
    localStorage.setItem(KEYS.char, JSON.stringify(next))
    return { chars: next }
  },
  async editCharacter(state, charId: string, char: NewCharacter) {
    const { avatar: file, ...props } = char
    const avatar = await getImageData(file)
    const newChar: GuestCharacter = { ...props, avatar, _id: v4() }
    const next = state.chars.map((ch) => (ch._id === charId ? newChar : ch))
    localStorage.setItem(KEYS.char, JSON.stringify(next))
    return { chars: next }
  },
}))

function init(): GuestState {
  const profile = JSON.parse(localStorage.getItem(KEYS.profile) || JSON.stringify(defaultProfile))
  const chars = JSON.parse(localStorage.getItem(KEYS.char) || JSON.stringify([STARTER_CHARACTER]))
  const messages = JSON.parse(localStorage.getItem(KEYS.messages) || '{}')
  const config = JSON.parse(localStorage.getItem(KEYS.config) || JSON.stringify(defaultConfig))

  return { chars, messages, config, profile }
}

async function getImageData(file?: File) {
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

export type GuestMsg = Omit<AppSchema.ChatMessage, 'updatedAt' | 'rating' | 'kind'>

export type GuestCharacter = Omit<
  AppSchema.Character,
  'kind' | 'userId' | 'updatedAt' | 'createdAt'
>

export type GuestProfile = { handle: string; avatar?: string }

export type GuestConfig = {
  novelApiKey: string
  novelModel: string
  hordeKey: string
  hordeModel: string
  koboldUrl: string
  luminaiUrl: string
  defaultAdapter: AIAdapter
}

type GuestState = {
  chars: GuestCharacter[]
  profile: GuestProfile
  messages: { [chatId: string]: GuestMsg[] }
  config: GuestConfig
}
