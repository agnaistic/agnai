import { neat, now } from '/common/util'
import { createStore } from '/web/store/create'
import { GuidedSession, GuidedTemplate, guidedApi } from '/web/store/data/guided'
import { parseTemplateV2 } from '/common/guidance/v2'
import { msgsApi } from '/web/store/data/messages'
import { toastStore } from '/web/store'
import { v4 } from 'uuid'
import { replaceTags } from '/common/presets/templates'

type GameState = {
  template: GuidedTemplate
  state: GuidedSession
  templates: GuidedTemplate[]
  sessions: GuidedSession[]
  inited: boolean
  busy: boolean
  showModal: 'help' | 'import' | 'none'
}

const init: GameState = {
  inited: false,
  sessions: [],
  templates: [],
  busy: false,
  template: {
    ...blankTemplate(),
    _id: '',
  },
  showModal: 'none',
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
    async *init({ inited }, id?: string) {
      if (!inited) {
        const templates = await guidedApi.getTemplates()
        const sessions = await guidedApi.getSessions()

        if (!templates.result.templates.length) {
          const res = await guidedApi.createTemplate(exampleTemplate())
          if (res.error) {
            toastStore.error(`Could not initialise modes: ${res.error}`)
            return
          }

          if (res.result) {
            templates.result.templates.push(res.result)
          }
        }

        yield {
          sessions: sessions.result.sessions.sort(sortByAge),
          templates: templates.result.templates,
          inited: true,
        }
      }

      if (id) {
        gameStore.loadSession(id)
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

      if (state.gameId === template._id) return

      // If we change template and we have a session loaded, we need to clear the session
      yield {
        state: {
          _id: 'new',
          format: state.format || 'Alpaca',
          overrides: {},
          gameId: template._id,
          responses: [],
          updated: now(),
          init: undefined,
          presetId: state.presetId,
        },
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
    importTemplate: async ({ templates }, importing: GuidedTemplate) => {
      importing.name = `${importing.name} (imported)`
      const res = await guidedApi.saveTemplate(importing)
      if (res.result) {
        const next = templates.concat(res.result)
        return { templates: next }
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
    async *newSession({ state }, templateId: string) {
      const init = state.gameId === templateId ? state.init : undefined
      const session = blankSession(templateId, {
        init,
        gameId: state.gameId,
        format: state.format,
        responses: [],
        overrides: state.overrides,
        _id: 'new',
      })
      yield { state: session }
    },
    async *saveSession({ state }, onSave?: (session: GuidedSession) => void) {
      const next = { ...state, updated: now() }
      const res = await guidedApi.saveSession(next)
      if (res.result) {
        yield { sessions: res.result.sessions, state: res.result.session }
        onSave?.(res.result.session)
      }
    },
    loadSession: async ({ sessions, templates, inited, template: current }, id: string) => {
      if (!inited) return

      if (id === 'new') {
        const session = blankSession(current._id)
        return { state: session }
      }

      const session = sessions.find((s) => s._id === id)
      if (!session) {
        toastStore.error(`Session not found: ${id}`)
        return
      }

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
      const game = blankTemplate()
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
      yield { busy: true, state: { ...state, init: undefined, responses: [], updated: now() } }
      const previous: any = {}

      for (const [key, value] of Object.entries(state.overrides)) {
        if (!value.trim()) continue
        previous[key] = value
      }

      const init = insertPlaceholders(template.init, template, state.overrides)
      const result = await msgsApi.guidance({
        prompt: replaceTags(init, state.format),
        previous,
        lists: template.lists,
      })

      yield {
        busy: false,
        state: {
          ...state,
          init: result,
          responses: [],
          updated: now(),
        },
      }

      gameStore.saveSession()
    },
    deleteResponse({ state }, index: number) {
      if (!state.responses.length) return

      const head = state.responses.slice(0, index)
      const tail = state.responses.slice(index + 1)
      gameStore.update({ responses: head.concat(tail) })
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

      const missing: string[] = []
      for (const manual of template.manual || []) {
        if (manual in state.overrides) continue
        missing.push(manual)
      }

      if (missing.length) {
        return toastStore.error(
          `Required fields are missing: ${missing.join(
            ', '
          )}. Fill them out in the configuration pane.`
        )
      }

      const { ast } = parseTemplateV2(replaceTags(template.history, state.format))
      const history: string[] = []

      if (state.init) {
        history.push(formatResponse(template.introduction, state, state.init))
      }

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
        prompt = prompt.replace(new RegExp(`{{${key}}}`, 'gi'), `${value}`)
      }

      for (const [key, value] of Object.entries(previous)) {
        prompt = prompt.replace(new RegExp(`{{${key}}}`, 'gi'), `${value}`)
      }

      prompt = replaceTags(prompt, state.format)
      console.log(prompt)
      const result = await msgsApi.guidance({
        prompt,
        presetId: state.presetId,
        lists: template.lists,
        placeholders: { history },
        previous: state.overrides,
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
    _id: v4(),
    name: 'New Template',
    byline: '',
    description: '',
    fields: [],
    history: '{{response}}',
    introduction: `{{scene}}`,
    response: `{{response}}`,
    display: '',
    lists: {},
    manual: [],
    ...newTemplate(),
  }
}

function newTemplate() {
  return {
    init: neat`
    Generate the game details for a "{{title}}" story roleplay RPG

    First name of the main character: "[main_char | temp=0.4 | stop="]"

    First name of the secondary character (the main character's friend): "[alt_char | temp=0.4 | stop="]"

    First name of the antagonist character: "[villain | temp=0.4 | stop="]"

    Write the opening scene of the roleplay to begin the RPG: "[scene | temp=0.4 | tokens=300 | stop="]"
    `,
    loop: neat`
    "{{title}}" story roleplay RPG

    The main character is: {{main_char}}.
    The secondary character (the main character's friend) is: {{alt_char}}.
    The antagonist of the story is: {{villain}}.

    <user>The opening scene of the roleplay story:
    {{scene}}</user>

    And then the story roleplay begins:

    {{history}}

    <user>{{main_char}}: {{input}}</user>

    <bot>
    [response | temp=0.4 | tokens=300 | stop=USER | stop=ASSISTANT | stop=</ | stop=<| | stop=### ]</bot>
    
    <user>

  `,
  }
}

function exampleTemplate(): GuidedTemplate {
  return {
    _id: '',
    fields: [],

    name: 'Detective RPG (Example)',
    byline: 'Solve AI generated crimes',
    description: '',
    introduction: `Introduction:\n{{intro}}\n\nOpening:\n{{scene}}`,
    response: '{{response}}',
    display: '',
    lists: {},
    manual: [],
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
    [response | temp=0.4 | tokens=300 | stop=USER | stop=ASSISTANT | stop=</ | stop=<| | stop=### ]</bot>

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

function insertPlaceholders(prompt: string, template: GuidedTemplate, values: Record<string, any>) {
  let output = prompt
  for (const manual of template.manual || []) {
    const value = values[manual] || ''
    const re = new RegExp(`{{${manual}}}`, 'gi')
    output = output.replace(re, value)
  }

  return output
}

function sortByAge(left: GuidedSession, right: GuidedSession) {
  const l = new Date(left.updated ?? 0).valueOf()
  const r = new Date(right.updated ?? 0).valueOf()
  return r - l
}
