import { extractCardData } from './card-utils'
import { formatCharacter } from '/common/characters'
import { characterBookToNative } from '/common/memory'
import { AppSchema } from '/common/types'
import { slugify } from '/common/util'
import { FileInputResult, getFileAsString } from '/web/shared/FileInput'
import { NewCharacter, toastStore } from '/web/store'
import { CHUB_URL } from '/web/store/chub'
import { TFunction } from 'i18next'

type ImportFormat = 'tavern' | 'tavernV2' | 'ooba' | 'agnai'

export const SUPPORTED_FORMATS = (t: TFunction) => t('supported_formats')

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

export async function importCharacterFile(t: TFunction, file: FileInputResult) {
  try {
    const ext = file.file.name.split('.').slice(-1)[0]
    if (IMAGE_FORMATS[ext]) {
      const char = await processImage(t, file)
      return { char, image: file.file }
    }

    if (TEXT_FORMATS[ext]) {
      const char = await processJSON(t, file)
      return { char, image: undefined }
    }

    throw new Error(
      t('invalid_file_format_x_supported_format_x', {
        name: file.file.name,
        formats: SUPPORTED_FORMATS(t),
      })
    )
  } catch (ex: any) {
    toastStore.error(
      t('failed_to_import_x_message_x', {
        name: file.file.name,
        message: ex.message,
      })
    )
    throw ex
  }
}

export function jsonToCharacter(t: TFunction, json: any): NewCharacter {
  const format = getImportFormat(t, json)

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
    return {
      name: json.name,
      greeting: json.first_mes,
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
  }
}

/**
 * @param t
 * @param path Character `fullPath`
 */
export async function downloadCharacterHub(t: TFunction, path: string) {
  const card = await fetch(`${CHUB_URL}/characters/download`, {
    method: 'post',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ format: 'tavern', fullPath: path, version: 'main' }),
  }).then((res) => res.blob())

  const file = new File([card], `charhub_${slugify(path)}.png`, { type: 'image/png' })
  const data = await extractCardData(t, file)
  const json = jsonToCharacter(t, data)
  json.avatar = file
  return { card, file, json }
}

function getImportFormat(t: TFunction, obj: any): ImportFormat {
  if (obj.kind === 'character' || isNativeCharacter(obj)) return 'agnai'
  if ('char_name' in obj) return 'ooba'
  if (obj.spec === 'chara_card_v2') return 'tavernV2'
  if ('mes_example' in obj) return 'tavern'

  throw new Error(t('unknown_import_format'))
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

async function processImage(t: TFunction, file: FileInputResult) {
  const json = await extractCardData(t, file.file)
  if (!json) {
    throw new Error(t('invalid_tavern_image'))
  }
  const parsed = jsonToCharacter(t, json)
  const character = Object.assign(parsed, { avatar: file.file }, { tags: parsed.tags || [] })

  toastStore.success(t('tavern_card_accepted'))
  return sanitiseCharacter(character)
}

async function processJSON(t: TFunction, file: FileInputResult) {
  const content = await getFileAsString(file)
  const json = JSON.parse(content)
  const char = jsonToCharacter(t, json)
  char.tags = char.tags || []
  toastStore.success(t('character_file_accepted'))
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
