import { AppSchema } from '../../db/schema'
import { logger } from '../../logger'

type PromptOpts = {
  chat: AppSchema.Chat
  char: AppSchema.Character
  history: AppSchema.ChatMessage[]
  message: string
}

const BOT_REPLACE = /\{\{char\}\}/g
const SELF_REPLACE = /\{\{user\}\}/g

export function createPrompt({ chat, char, history, message }: PromptOpts) {
  const username = chat.username || 'You'

  const lines: string[] = [`${char.name}'s Persona: ${formatCharacter(char.name, char.persona)}`]

  if (chat.scenario) {
    lines.push(`Scenario: ${chat.scenario}`)
  }

  lines.push(
    `<START>`,
    ...chat.sampleChat.split('\n'),
    ...history.slice(-8).map((chat) => prefix(chat, char.name, username) + chat.msg),
    `${username}: ${message}`,
    `${char.name}:`
  )

  const prompt = lines
    .filter(removeEmpty)
    .join('\n')
    .replace(BOT_REPLACE, char.name)
    .replace(SELF_REPLACE, username)

  return prompt
}

export function formatCharacter(name: string, persona: AppSchema.CharacterPersona) {
  if (persona.kind === 'text') return persona.text

  switch (persona.kind) {
    case 'wpp': {
      const attrs = Object.entries(persona.attributes)
        .map(([key, values]) => `${key}(${values.map(quote).join(' + ')})`)
        .join('\n')

      return [`[character("${name}") {`, attrs, '}]'].join('\n')
    }

    case 'json': {
      return JSON.stringify(
        {
          type: 'character',
          name,
          properties: persona.attributes,
        },
        null,
        2
      )
    }

    case 'sbf': {
      const attrs = Object.entries(persona.attributes).map(
        ([key, values]) => `${key}: ${values.map(quote).join(', ')}`
      )

      return `[ character: "${name}"; ${attrs.join('; ')} ]`
    }

    case 'boostyle': {
      const attrs = Object.values(persona.attributes).reduce(
        (prev, curr) => {
          prev.push(...curr)
          return prev
        },
        [name]
      )
      return attrs.join(' + ')
    }
  }
}

export function exportCharacter(char: AppSchema.Character, target: 'tavern' | 'ooba') {
  switch (target) {
    case 'tavern': {
      return {
        name: char.name,
        first_mes: char.greeting,
        scenario: char.scenario,
        description: formatCharacter(char.name, char.persona),
        mes_example: char.sampleChat,
      }
    }

    case 'ooba': {
      return {
        char_name: char.name,
        char_greeting: char.greeting,
        world_scenario: char.scenario,
        char_persona: formatCharacter(char.name, char.persona),
        example_dialogue: char.sampleChat,
      }
    }
  }
}

function quote(str: string) {
  return `"${str}"`
}

function prefix(chat: AppSchema.ChatMessage, bot: string, user: string) {
  return chat.characterId ? `${bot}: ` : `${user}: `
}

function removeEmpty(value?: string) {
  return !!value
}
