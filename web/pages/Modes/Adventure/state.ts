import { neat, now } from '/common/util'
import { storage } from '/web/shared/util'
import { createStore } from '/web/store/create'
import { GuidedSession, GuidedTemplate, guidedApi, replaceTags } from '/web/store/data/guided'
import { parseTemplateV2 } from '/common/guidance/v2'
import { msgsApi } from '/web/store/data/messages'
import { toastStore } from '/web/store'
import { v4 } from 'uuid'

type GameState = {
  template: GuidedTemplate
  state: GuidedSession
  templates: GuidedTemplate[]
  sessions: GuidedSession[]
  inited: boolean
  busy: boolean
  pane?: 'prompt'
  showHelp: boolean
}

const init: GameState = {
  inited: false,
  sessions: [],
  templates: [],
  busy: false,
  template: {
    _id: '',
    name: '',
    byline: '',
    description: '',
    init: '',
    response: '',
    display: '',
    introduction: `{{response}}`,
    history: '{{response}}',
    loop: '',
    fields: [],
    lists: {},
  },
  pane: 'prompt',
  showHelp: false,
  state: {
    format: 'Alpaca',
    _id: '',
    gameId: '',
    overrides: {},
    responses: [],
    updated: now(),
  },
}

export const gameStore = createStore<GameState>(
  'game',
  init
)((get, set) => {
  return {
    init: async ({ inited, ...prev }) => {
      if (inited) return

      const templates = await guidedApi.getTemplates()
      const sessions = await guidedApi.getSessions()
      const lastSessionId = storage.localGetItem('rpg-last-template')

      const session = sessions.result.sessions.find((s) => s._id === lastSessionId) || prev.state
      const template =
        templates.result.templates.find((t) => t._id === session?.gameId) || exampleTemplate()

      if (!templates.result.templates.length) {
        templates.result.templates.push(exampleTemplate())
      }

      return {
        sessions: sessions.result.sessions.sort(sortByAge),
        templates: [blankTemplate()].concat(templates.result.templates),
        inited: true,
        state: session,
        template,
      }
    },
    async *loadTemplate({ templates, state }, id: string) {
      const template = templates.find((g) => g._id === id)
      if (!template) {
        toastStore.error(`Template not found`)
        return
      }

      if (!template.lists) {
        template.lists = {}
      }

      yield { template }

      // If we change template and we have a session loaded, we need to clear the session
      if (state.init && state.gameId !== template._id) {
        yield {
          template,
          state: {
            _id: '',
            format: state.format || 'Alpaca',
            gameId: template._id,
            overrides: {},
            responses: [],
            updated: now(),
          },
        }
      }
    },
    saveTemplate: async ({ templates, template: game }) => {
      const res = await guidedApi.saveTemplate(game)
      if (res.result) {
        const template = res.result
        const next = templates.filter((t) => t._id !== template._id).concat(template)
        return { template: res.result, templates: next }
      }
    },
    saveTemplateCopy: async ({ templates, template: game }) => {
      const copy = { ...game }
      copy._id = v4()
      copy.name = `${game.name} (Copy)`
      const res = await guidedApi.saveTemplate(copy)

      if (res.result) {
        const template = res.result
        const next = templates.filter((t) => t._id !== template._id).concat(template)
        return { template: res.result, templates: next, state: blankSession(template._id) }
      }
    },
    updateInput: ({ state }, index: number, text: string) => {
      const msg = { ...state.responses[index] }
      msg.input = text
      const next = state.responses.map((m, i) => (index === i ? msg : m))
      return { state: { ...state, responses: next } }
    },
    updateResponse: ({ state }, index: number, text: string) => {
      const msg = { ...state.responses[index] }
      msg.response = text
      const next = state.responses.map((m, i) => (index === i ? msg : m))
      return { state: { ...state, responses: next } }
    },
    saveSession: async ({ state }) => {
      const next = { ...state, updated: now() }
      const res = await guidedApi.saveSession(next)
      if (res.result) {
        storage.localSetItem('rpg-last-template', res.result.session._id)
        return { sessions: res.result.sessions, state: res.result.session }
      }
    },
    loadSession: async ({ sessions, templates }, id: string) => {
      const session = sessions.find((s) => s._id === id)
      if (!session) {
        toastStore.error(`Session not found`)
        return
      }

      storage.localSetItem('rpg-last-template', session._id)
      if (!session.format) {
        session.format = 'Alpaca'
      }

      const template = templates.find((t) => t._id === session.gameId)
      if (!template) {
        toastStore.error(`Session template not found`)
        return
      }

      return { state: session, template }
    },
    createTemplate: () => {
      const game = exampleTemplate()
      return { template: game }
    },
    updateTemplate({ template: game }, update: Partial<GuidedTemplate>) {
      const next = { ...game, ...update }
      return { template: next }
    },

    update({ state }, update: Partial<GuidedSession>) {
      const next = { ...state, ...update, updated: now() }
      return { state: next }
    },
    async *start({ template, state }) {
      yield { busy: true }
      const previous: any = {}

      for (const [key, value] of Object.entries(state.overrides)) {
        if (!value.trim()) continue
        previous[key] = value
      }

      const result = await msgsApi.guidance({
        prompt: replaceTags(template.init, state.format),
        previous,
        lists: template.lists,
      })

      const gameId = state.gameId || template._id
      yield {
        busy: false,
        state: blankSession(gameId, {
          init: result,
          overrides: state.overrides,
          format: state.format,
        }),
      }
    },
    undo({ state }) {
      if (!state.responses.length) return
      const next = state.responses.slice(0, -1)
      gameStore.update({ responses: next })
    },
    async *retry({ state }) {
      if (!state.responses.length) return

      const responses = state.responses.slice(0, -1)
      const last = state.responses.slice(-1)[0]

      gameStore.update({ responses })
      gameStore.send(`${last.input}`, () => {})
    },

    async *send({ template, state }, text: string, onSuccess: () => void) {
      yield { busy: true }
      const ast = parseTemplateV2(replaceTags(template.history, state.format))
      const history: string[] = []

      for (const resp of state.responses) {
        let line = ''
        for (const node of ast) {
          if (node.kind === 'text') {
            line += node.text
            continue
          }

          const value = resp[node.name] || ''
          line += value
        }
        history.push(line)
      }

      const last = state.responses.slice(-1)[0]
      const previous = Object.assign({}, state.init, last || {})

      for (const [key, value] of Object.entries(state.overrides)) {
        if (!value.trim()) continue
        previous[key] = value
      }

      let prompt = template.loop.replace(/{{input}}/g, text).replace(/\n\n+/g, '\n\n')

      for (const [key, value] of Object.entries(previous)) {
        prompt = prompt.replace(new RegExp(`{{${key}}}`, 'g'), `${value}`)
      }

      prompt = replaceTags(prompt, state.format)
      console.log(prompt)
      const result = await msgsApi.guidance({
        prompt,
        lists: template.lists,
        placeholders: { history },
      })
      console.log(JSON.stringify(result, null, 2))
      onSuccess()

      result.input = text
      const next = state.responses.concat(result)
      yield {
        busy: false,
        state: Object.assign({}, state, { responses: next }),
      }
      gameStore.saveSession()
    },
  }
})

function blankSession(gameId: string, overrides: Partial<GuidedSession> = {}): GuidedSession {
  return {
    _id: v4(),
    format: 'Alpaca',
    gameId,
    overrides: {},
    responses: [],
    updated: now(),
    ...overrides,
  }
}

function blankTemplate(): GuidedTemplate {
  return {
    _id: '',
    name: 'New Template',
    byline: '',
    description: '',
    fields: [],
    init: '',
    loop: '',
    history: '',
    introduction: `{{response}}`,
    response: '`{{response}}',
    display: '',
    lists: {},
  }
}

function exampleTemplate(): GuidedTemplate {
  return {
    _id: '',
    fields: [],

    name: 'Detective rpg',
    byline: 'Solve AI generated crimes',
    description: '',
    introduction: `Introduction:\n{{intro}}\n\nOpening:\n{{scene}}`,
    response: '{{response}}',
    display: '',
    lists: {},
    init: neat`
      Generate the game details for a "detective who-dunnit" RPG.

      First and last name of the main character: "[main_char | temp=0.4 | stop="]"

      First and last name of the main character's partner: "[main_friend | temp=0.4 | stop="]"

      First and last name of the villain of the RPG: "[villain | temp=0.4 | stop="]"

      Where is the main character currently standing?: "[location | tokens=50 | stop=" | temp=0.4]"

      What is the villain's motive for the crime?: "[evil_goal | temp=0.4 | stop="]"

      What is the villian's back story?: "[villain_story | temp=0.4 | stop="]"

      Write the main character's main objective: "Your goal [goal | temp=0.4 | stop="]"

      Write the introduction to the game: "You are [intro | temp=0.4 | stop="]"
      
      Write the opening scene of the game to begin the game: "[scene | temp=0.4 | tokens=300 | stop="]"`,

    history: neat`
      <user>
      [input]</user>

      <bot>
      [response]</bot>
    `,
    loop: neat`
    "detective who-dunnit" RPG

    The player's main objective for the RPG is "{{goal}}"
    The player's name (the main character) is called "{{main_char}}"
    The name of the main character's partner is "{{main_friend}}"
    The villain of the story is "{{villain}}"
    The villain's back story is "{{villain_story}}"
    The villain's motive for the crime is "{{evil_goal}}"
    The player's location was: "{{location}}"

    GAME HISTORY:
    {{scene}}

    {{history}}

    <user>
    {{main_char}}: {{input}}</user>

    Write the next scene with the character's in the scene actions and dialogue.

    <bot>
    Scene: [response | temp=0.4 | tokens=400 | stop=USER | stop=ASSISTANT | stop=<|user|> | stop=<|system|> | stop=Instruction | stop=### ]</bot>

    <user>
    Where is the main character currently standing?</user>

    <bot>
    Location: "[location | temp=0.4 | tokens=50 | stop="]"</bot>`,
  }
}

export function formatResponse(
  template: string,
  session: GuidedSession,
  values: Record<string, any>
) {
  const format = template || '{{response}}'
  const lines = format.split('\n')
  const outputs: string[] = []

  for (let line of lines) {
    const trim = line.trim()
    const isPlaceholderOnly = trim.startsWith('{{') && trim.endsWith('}}') && !trim.includes(' ')

    const re = /{{[a-zA-Z0-9_-]+}}/g

    while (true) {
      const match = re.exec(line)
      if (!match) break
      const key = match[0].replace('{{', '').replace('}}', '').trim()
      if (!key) continue
      const value = session.overrides[key] || values[key] || session.init?.[key] || ''
      line = line.replace(match[0], `${value}`)
    }

    if (!line.trim() && isPlaceholderOnly) {
      continue
    }

    outputs.push(line)
  }

  const output = outputs.join('\n')
  return output
}

function sortByAge(left: GuidedSession, right: GuidedSession) {
  const l = new Date(left.updated ?? 0).valueOf()
  const r = new Date(right.updated ?? 0).valueOf()
  return r - l
}
