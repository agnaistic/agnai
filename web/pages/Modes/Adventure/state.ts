import { v4 } from 'uuid'
import { neat } from '/common/util'
import { storage } from '/web/shared/util'
import { createStore } from '/web/store/create'

export type GameField = {
  name: string
  label: string
  visible: boolean
  type: 'string' | 'number' | 'boolean'
}

type Game = {
  _id: string
  name: string
  init: string
  history: string
  loop: string
  fields: GameField[]
  responses: Array<Record<string, string>>
}

type GameState = {
  game: Game
  saves: Game[]
}

const init: Game = {
  _id: '',
  name: '',
  init: '',
  history: '',
  loop: '',
  fields: [],
  responses: [],
}

export const gameStore = createStore<GameState>('game', { game: init, saves: [] })((get, set) => {
  return {
    init: async () => {
      const saved = await storage.getItem('rpg-storage')
      if (!saved) return { game: defaultGame() }

      const lastGame = storage.localGetItem('rpg-last-game')

      const saves = JSON.parse(saved) as Game[]
      const last = saves.find((g) => g._id === lastGame) || defaultGame()
      return { saves, game: last }
    },
    load: async ({ saves }, id: string) => {
      const game = saves.find((g) => g._id === id)
      if (game) return { game }
    },
    save: async ({ game, saves }) => {
      storage.localSetItem('rpg-last-game', game._id)
      const next = saves.filter((g) => g._id !== game._id)
      next.push(game)
      await storage.setItem('rpg-storage', JSON.stringify(next))
    },
    create: () => {
      const game = defaultGame()
      return { game }
    },
    update({ game }, update: Partial<Game>) {
      const next = { ...game, ...update }
      return { game: next }
    },
  }
})

function defaultGame(): Game {
  return {
    _id: v4(),
    fields: [],

    name: 'detective rpg',
    responses: [],
    init: neat`
      Generate the game details for a "detective who-dunnit" RPG:

      Real first and last name of the main character: "[main_char | temp=0.4 | stop="]"

      Real first and last name of the main character's partner: "[main_friend | temp=0.4 | stop="]"

      Real first and last name of the villain of the RPG: "[villain | temp=0.4 | stop="]"

      Where is the main character currently standing?: "[location | tokens=50 | stop=" | temp=0.4]"

      What is the villain's motive for the crime?: "[evil_goal | temp=0.4 | stop="]"

      What is the villian's back story?: "[villain_story | temp=0.4 | stop="]"

      Write the main character's main objective: "Your goal [goal | temp=0.4 | stop="]"

      Write the introduction to the game: "You are [intro | temp=0.4 | stop="]"
      
      Write the opening scene of the game to begin the game: "[scene | temp=0.4 | tokens=300 | stop="]"`,

    history: neat`
      USER: [input]

      ASSISTANT: [response]
    `,
    loop: neat`GAME:
      "detective who-dunnit" RPG
      
      GAME STATE:
      The player's main objective for the RPG is "{{goal}}"
      The player's name (the main character) is called "{{main_char}}"
      The name of the main character's partner is "{{main_friend}}"
      The villain of the story is "{{villain}}"
      The villain's back story is "{{villain_story}}"
      The villain's motive for the crime is "{{evil_goal}}"
      The player's location was: "{{location}}"
      
      GAME HISTORY:
      ASSISTANT: {{scene}}
      
      {{history}}
      
      The player's action:
      \`\`\`
      {{input}}
      \`\`\`
      
      Write the next scene how the character's in the scene respond to the player's action.
      Use markdown format for your response.
      \`\`\`
      [response | temp=0.4 | tokens=400 | stop=\`]
      \`\`\``,
  }
}
