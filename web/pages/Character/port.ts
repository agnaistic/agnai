import { extractCardData } from './card-utils'
import { formatCharacter } from '/common/characters'
import { characterBookToNative } from '/common/memory'
import { AppSchema } from '/common/types'
import { slugify } from '/common/util'
import { FileInputResult, getFileAsString } from '/web/shared/FileInput'
import { NewCharacter, toastStore } from '/web/store'
import { CHUB_URL } from '/web/store/chub'

type ImportFormat = 'tavern' | 'tavernV2' | 'ooba' | 'agnai' | 'charas'

export const SUPPORTED_FORMATS = 'Agnaistic, CAI, TavernAI, TextGen, Pygmalion'

export const IMAGE_FORMATS: Record<string, boolean> = {
  apng: true,
  png: true,
  jpg: true,
  jpeg: true,
  webp: true,
}

export const TEXT_FORMATS: Record<string, boolean> = {
  json: true,
}

export async function importCharacterFile(file: FileInputResult) {
  try {
    const ext = file.file.name.split('.').slice(-1)[0]
    if (IMAGE_FORMATS[ext]) {
      const char = await processImage(file)
      return { char, image: file.file }
    }

    if (TEXT_FORMATS[ext]) {
      const char = await processJSON(file)
      return { char, image: undefined }
    }

    throw new Error(
      `Invalid file format: ${file.file.name}. Supported formats: ${SUPPORTED_FORMATS}`
    )
  } catch (ex: any) {
    toastStore.error(`Failed to import ${file.file.name}: ${ex.message}`)
    throw ex
  }
}

export function jsonToCharacter(json: any): NewCharacter {
  const format = getImportFormat(json)

  if (format === 'agnai') {
    return json
  }

  if (format === 'ooba') {
    return {
      name: json.char_name,
      greeting: json.char_greeting,
      persona: {
        kind: 'text',
        attributes: {
          text: [json.char_persona],
        },
      },
      sampleChat: json.example_dialogue,
      scenario: json.world_scenario,
      originalAvatar: undefined,
    }
  }

  if (format === 'tavern') {
    const ext = json.extensions || {}
    return {
      name: json.name,
      greeting: json.first_mes,
      appearance: ext?.appearance,
      persona: {
        kind: 'text',
        attributes: {
          text: [[json.description, json.personality].filter((text) => !!text).join('\n')],
        },
      },
      sampleChat: json.mes_example,
      scenario: json.scenario,
      originalAvatar: undefined,
    }
  }

  if (format === 'charas') {
    const v2 = json.data || {}
    const ext = v2.extensions || {}

    return {
      name: json.name,
      description: json.description,
      greeting: json.first_mes,
      appearance: ext?.appearance,
      creator: v2.creator,
      persona: {
        kind: 'text',
        attributes: {
          text: [[json.personality].filter((text) => !!text).join('\n')],
        },
      },
      sampleChat: json.mes_example,
      scenario: json.scenario,
      originalAvatar: undefined,
      systemPrompt: v2.system_prompt,
      postHistoryInstructions: v2.post_history_instructions,
      tags: Array.isArray(v2.tags) ? v2.tags : [],
      alternateGreetings: Array.isArray(v2.alternate_greetings) ? v2.alternate_greetings : [],
      extensions: ext,
    }
  }
  /**
   * format === 'tavernV2'
   * Tests, in the case we previously saved the lossless Agnai "Persona" data,
   * whether the card has been edited in another application since then,
   * causing the saved "Persona" data to be obsolete.
   */
  const isSavedPersonaMissingOrOutdated =
    json.data.extensions.agnai?.persona === undefined ||
    formatCharacter(json.data.name, json.data.extensions.agnai?.persona) !== json.data.description

  return {
    name: json.data.name,
    greeting: json.data.first_mes,
    persona: isSavedPersonaMissingOrOutdated
      ? {
          kind: 'text',
          attributes: {
            text: [
              [json.data.description, json.data.personality].filter((text) => !!text).join('\n'),
            ],
          },
        }
      : json.data.extensions.agnai.persona,
    sampleChat: json.data.mes_example,
    scenario: json.data.scenario,
    originalAvatar: undefined,
    alternateGreetings: json.data.alternate_greetings,
    characterBook: json.data.character_book
      ? characterBookToNative(json.data.character_book)
      : undefined,
    extensions: json.data.extensions,
    systemPrompt: json.data.system_prompt,
    postHistoryInstructions: json.data.post_history_instructions,
    creator: json.data.creator,
    characterVersion: json.data.character_version,
    tags: json.data.tags,
    description: json.data.creator_notes,
    voice: json.data.extensions.agnai?.voice,
    insert: json.data.extensions.depth_prompt,
    json: json.data.extensions.agnai?.json,
  }
}

/**
 * @param path Character `fullPath`
 */
export async function downloadCharacterHub(path: string) {
  const card = await fetch(`${CHUB_URL}/characters/download`, {
    method: 'post',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ format: 'tavern', fullPath: path, version: 'main' }),
  }).then((res) => res.blob())

  const file = new File([card], `charhub_${slugify(path)}.png`, { type: 'image/png' })
  const data = await extractCardData(file)
  const json = jsonToCharacter(data)
  json.avatar = file
  return { card, file, json }
}

function getImportFormat(obj: any): ImportFormat {
  if (obj.kind === 'character' || isNativeCharacter(obj)) return 'agnai'
  if (obj.extensions?.charas) return 'charas'
  if ('char_name' in obj) return 'ooba'
  if (obj.spec === 'chara_card_v2') return 'tavernV2'
  if ('mes_example' in obj) return 'tavern'

  throw new Error('Unknown import format')
}

function isNativeCharacter(obj: any): obj is AppSchema.Character {
  return (
    'name' in obj &&
    'persona' in obj &&
    'greeting' in obj &&
    'scenario' in obj &&
    'sampleChat' in obj
  )
}

async function processImage(file: FileInputResult) {
  const json = await extractCardData(file.file)
  if (!json) {
    throw new Error('Invalid tavern image')
  }
  const parsed = jsonToCharacter(json)
  const character = Object.assign(parsed, { avatar: file.file }, { tags: parsed.tags || [] })

  toastStore.success(`Tavern card accepted`)
  return sanitiseCharacter(character)
}

async function processJSON(file: FileInputResult) {
  const content = await getFileAsString(file)
  const json = JSON.parse(content)
  const char = jsonToCharacter(json)
  char.tags = char.tags || []
  toastStore.success('Character file accepted')
  return sanitiseCharacter(char)
}

function sanitiseCharacter<T>(char: T): T {
  for (const key in char) {
    const prop = key as keyof T
    const value = char[prop]
    if (typeof value !== 'string') continue
    char[prop] = (value as string)
      .replace(/\\n/g, '\n')
      .replace(/^You:/i, '{{user}}:')
      .replace(/\nYou:/g, '\n{{user}}:') as any
  }

  return char
}
