import { AppSchema } from './types/schema'
import { nativeToCharacterBook } from './memory'

export const defaultChars = {
  Robot: {
    name: 'Robot',
    persona: {
      kind: 'attributes',
      attributes: {
        species: ['robot'],
        personality: ['kind, compassionate, caring, tender, forgiving, enthusiastic'],
      },
    },
    sampleChat:
      '{{user}}: I have some big and important news to share!\n{{char}}: *{{char}} appears genuinely excited* What is the exciting news?',
    scenario:
      "{{char}} is sitting at a table in a busy cafe. You approach {{char}}'s table and wave at them. {{user}} sits down at the table in the chair opposite {{char}}.",
    greeting:
      "*A soft smile appears on {{char}}'s face as {{user}} enters the cafe and takes a seat* *Beep! Boop!* Hello, {{user}}! It's good to see you again. What would you like to chat about?",
  },
} satisfies {
  [key: string]: Pick<
    AppSchema.Character,
    'name' | 'persona' | 'sampleChat' | 'scenario' | 'greeting'
  >
}

export function exportCharacter(char: AppSchema.Character, target: 'tavern' | 'ooba') {
  switch (target) {
    case 'tavern': {
      return {
        // Backfilled V1 fields
        // TODO: 2 months after V2 adoption, change every field with "This is
        // a V2 card, update your frontend <link_with_more_details_goes_here>"
        name: char.name,
        first_mes: char.greeting,
        scenario: char.scenario,
        description: formatCharacter(char.name, char.persona),
        personality: '',
        mes_example: char.sampleChat,

        // V2 data
        spec: 'chara_card_v2',
        spec_version: '2.0',
        data: {
          name: char.name,
          first_mes: char.greeting,
          scenario: char.scenario,

          description: formatCharacter(char.name, char.persona),
          personality: '',
          mes_example: char.sampleChat,

          // new v2 fields
          creator_notes: char.description ?? '',
          system_prompt: char.systemPrompt ?? '',
          post_history_instructions: char.postHistoryInstructions ?? '',
          alternate_greetings: char.alternateGreetings ?? [],
          character_book: char.characterBook
            ? nativeToCharacterBook(char.characterBook)
            : undefined,
          tags: char.tags ?? [],
          creator: char.creator ?? '',
          character_version: char.characterVersion ?? '',
          extensions: {
            ...(char.extensions ?? {}),
            depth_prompt: char.insert,
            agnai: {
              voice: char.voice,
              persona: char.persona,
              appearance: char.appearance,
              json: char.json,
              sprite: char.sprite,
            },
          },
        },
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

export function formatCharacter(
  name: string,
  persona: AppSchema.Persona,
  kind?: AppSchema.Persona['kind']
) {
  switch (kind || persona.kind) {
    case 'wpp': {
      const attrs = Object.entries(persona.attributes)
        .map(([key, values]) => `${key}(${values.map(quote).join(' + ')})`)
        .join('\n')

      return [`[character("${name}") {`, attrs, '}]'].join('\n')
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

    case 'attributes': {
      const attrs = Object.entries(persona.attributes)
        .map(([key, value]) => `${key}: ${value.join(', ')}`)
        .join('\n')

      return `Name: ${name}\n${attrs}`
    }

    case 'text': {
      const text = persona.attributes.text?.[0]
      return text || ''
    }
  }
}

function quote(str: string) {
  return `"${str}"`
}
