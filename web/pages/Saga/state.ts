import { neat, now } from '/common/util'
import { createStore } from '/web/store/create'
import { SagaSession, SagaTemplate, sagaApi } from '/web/store/data/saga'
import { parseTemplateV2 } from '/common/guidance/v2'
import { msgsApi } from '/web/store/data/messages'
import { toastStore } from '/web/store'
import { v4 } from 'uuid'
import { replaceTags } from '/common/presets/templates'

type SagaState = {
  template: SagaTemplate
  state: SagaSession
  templates: SagaTemplate[]
  sessions: SagaSession[]
  inited: boolean
  busy: boolean
  showModal: 'help' | 'import' | 'none'
}

const init: SagaState = {
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

export const sagaStore = createStore<SagaState>(
  'game',
  init
)((get, set) => {
  return {
    async *init({ inited }, id?: string, onLoad?: () => void) {
      if (!inited) {
        const templates = await sagaApi.getTemplates()
        const sessions = await sagaApi.getSessions()

        if (!templates.result.templates.length) {
          const res = await sagaApi.createTemplate(exampleTemplate())
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

        onLoad?.()
      }

      if (id) {
        sagaStore.loadSession(id)
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
      const res = await sagaApi.saveTemplate(game)
      if (res.result) {
        const template = res.result
        const next = templates.filter((t) => t._id !== template._id).concat(template)
        toastStore.success('Saga template saved')
        return { template: res.result, templates: next }
      }
    },
    importTemplate: async ({ templates }, importing: SagaTemplate) => {
      importing.name = `${importing.name} (imported)`
      const res = await sagaApi.saveTemplate(importing)
      if (res.result) {
        const next = templates.concat(res.result)
        return { templates: next }
      }
    },
    saveTemplateCopy: async ({ templates, template: game }) => {
      const copy = { ...game }
      copy._id = v4()
      copy.name = `${game.name} (Copy)`
      const res = await sagaApi.saveTemplate(copy)

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
    updateMsg: ({ state }, index: number, mods: Record<string, any>) => {
      const msg = { ...state.responses[index], ...mods }
      const next = state.responses.map((m, i) => (index === i ? msg : m))
      return { state: { ...state, responses: next } }
    },
    updateIntro: ({ state }, mods: Record<string, any>) => {
      const intro = { ...state.init, ...mods }
      return { state: { ...state, init: intro } }
    },
    async *newSession({ state }, templateId: string, onSuccess?: (id: string) => void) {
      const init = state.gameId === templateId ? state.init : undefined
      const id = v4()
      const session = blankSession(templateId, {
        init,
        gameId: state.gameId,
        format: state.format,
        responses: [],
        overrides: state.overrides,
        _id: id,
      })
      yield { state: session }
      onSuccess?.(id)
    },
    async *deleteTemplate({ templates }, id: string, onSuccess?: () => void) {
      const res = await sagaApi.removeTemplate(id)
      if (res.result) {
        yield { templates: templates.filter((t) => t._id !== id) }
        onSuccess?.()
        toastStore.success('Saga template deleted')
      }
    },
    async *deleteSession({ state, sessions }, id: string, onSuccess?: () => void) {
      const res = await sagaApi.removeSession(id)

      if (res.result) {
        if (id === state._id) {
          yield {
            state: {
              ...state,
              _id: v4(),
              responses: [],
              gameId: state.gameId,
              format: state.format,
              init: undefined,
              overrides: {},
              updated: new Date().toISOString(),
            },
          }
        }
        yield { sessions: sessions.filter((s) => s._id !== id) }
        toastStore.success('Saga session deleted')
        onSuccess?.()
      }
    },
    async *saveSession({ state }, onSave?: (session: SagaSession) => void) {
      const next = { ...state, updated: now() }
      const res = await sagaApi.saveSession(next)
      if (res.result) {
        onSave?.(res.result.session)
        yield { sessions: res.result.sessions, state: res.result.session }
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
    updateTemplate({ template: game }, update: Partial<SagaTemplate>) {
      const next = { ...game, ...update }

      const fields = new Set(next.fields.filter((f) => !!f.list).map((f) => f.list))
      const lists: Record<string, string[]> = {}
      for (const [name, list] of Object.entries(next.lists)) {
        if (!list.length && !fields.has(name)) {
          continue
        }
        lists[name] = list.map(toTrimmed)
      }

      next.lists = lists

      return { template: next }
    },

    update({ state }, update: Partial<SagaSession>) {
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

      sagaStore.saveSession()
    },
    deleteResponse({ state }, index: number) {
      if (!state.responses.length) return

      const head = state.responses.slice(0, index)
      sagaStore.update({ responses: head })
    },
    async *retry({ state }) {
      if (!state.responses.length) return

      const original = state.responses.slice()
      const responses = state.responses.slice(0, -1)
      const last = state.responses.slice(-1)[0]

      sagaStore.update({ responses })
      sagaStore.send(`${last.input}`, (error) => {
        if (!error) return
        sagaStore.update({ responses: original })
      })
    },

    async *send({ template, state }, text: string, onDone: (error?: string) => void) {
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

      for (const field of template.fields) {
        if (!field.list) continue

        const list = template.lists[field.list]
        if (!list?.length) {
          missing.push(field.list)
          continue
        }
      }

      if (missing.length) {
        return toastStore.error(
          `Referenced lists are empty: ${missing.join(
            ', '
          )}. Fill them out in the configuration pane.`
        )
      }

      yield { busy: true }

      const { ast } = parseTemplateV2(replaceTags(template.history, state.format))
      const history: string[] = []

      if (state.init) {
        history.push(formatResponse(template.introduction, state, state.init))
      }

      for (const resp of state.responses) {
        let line = ''
        for (const node of ast) {
          if (node.kind === 'text') {
            line += formatResponse(node.text, state, resp)
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
      const result = await msgsApi
        .guidance({
          prompt,
          presetId: state.presetId,
          lists: template.lists,
          placeholders: { history },
          previous: state.overrides,
        })
        .catch((err) => ({ err }))

      if ('err' in result) {
        const message = result.err.error || 'An unexpected error occurred'
        toastStore.error(message)
        yield { busy: false }
        return
      }
      console.log(JSON.stringify(result, null, 2))
      onDone()

      result.input = text
      const next = state.responses.concat(result)
      yield {
        busy: false,
        state: Object.assign({}, state, { responses: next }),
      }
      sagaStore.saveSession()
    },
  }
})

function blankSession(gameId: string, overrides: Partial<SagaSession> = {}): SagaSession {
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

function blankTemplate(): SagaTemplate {
  return {
    _id: v4(),
    name: 'New Template',
    byline: '',
    description: '',
    imagePrompt: '{{image_caption}}',
    imagesEnabled: false,
    fields: [],
    history: neat`<user>{{input}}</user>

    <bot>{{response}}</bot>`,
    introduction: `{{scene}}`,
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

function exampleTemplate(): SagaTemplate {
  return {
    _id: '',
    fields: [],

    name: 'Detective RPG (Example)',
    byline: 'Solve AI generated crimes',
    description: '',
    introduction: `Introduction:\n{{intro}}\n\nOpening:\n{{scene}}`,
    imagePrompt:
      'full body shot, selfie, {{image_caption}}, fantasy art, high quality, studio lighting',
    imagesEnabled: false,
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
      
      Write the opening scene of the game to begin the game: "[scene | temp=0.4 | tokens=300 | stop="]"
      
      Write a brief image caption describing the scene and appearances of the characters: "[image_caption | tokens=200 | stop="]"
      `,

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
    Write a brief image caption describing the scene and appearances of the characters: "[image_caption | tokens=200 | stop="]"

    <user>
    Where is the main character currently standing?</user>

    <bot>
    Location: "[location | temp=0.4 | tokens=50 | stop="]"</bot>`,
  }
}

export function formatResponse(
  template: string,
  session: SagaSession,
  values: Record<string, any>
) {
  let output = template || '{{response}}'

  const matches = getPlaceholderNames(output)

  if (!matches.length) return output

  for (const { key, match } of matches) {
    if (!key) continue
    const value = session.overrides[key] || values[key] || session.init?.[key] || ''
    output = output.replace(match, `${value}`)
  }

  return output
}

function insertPlaceholders(prompt: string, template: SagaTemplate, values: Record<string, any>) {
  let output = prompt
  for (const manual of template.manual || []) {
    const value = values[manual] || ''
    const re = new RegExp(`{{${manual}}}`, 'gi')
    output = output.replace(re, value)
  }

  return output
}

function sortByAge(left: SagaSession, right: SagaSession) {
  const l = new Date(left.updated ?? 0).valueOf()
  const r = new Date(right.updated ?? 0).valueOf()
  return r - l
}

function toTrimmed(value: string) {
  return value.trim()
}

export function getPlaceholderNames(prompt: string) {
  const matches = prompt
    .match(/{{[a-z0-9_-]+}}/gi)
    ?.map((name) => ({ match: name, key: name.replace('{{', '').replace('}}', '').trim() }))
    .filter((name) => !!name)
  return matches || []
}
