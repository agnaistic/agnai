import { v4 } from 'uuid'
import { storage } from '/web/shared/util'
import { localApi } from './storage'

const KEYS = {
  templates: 'agnai-guided-templates',
  sessions: 'agnai-guided-sessions',
}

export type FieldKind = 'string' | 'number' | 'boolean'
export type FieldType = string | number | boolean

export type GuidedField = {
  name: string
  label: string
  visible: boolean
  type: FieldKind
  list?: string
}

export type GuidedTemplate = {
  _id: string
  name: string
  byline: string
  description: string
  response: string
  introduction: string
  init: string
  loop: string
  history: string
  fields: Array<GuidedField>
  lists: Record<string, string[]>
}

export type GuidedResponse = {
  input: string
  response: string
} & Record<string, FieldType>

export type GuidedSession = {
  _id: string
  gameId: string

  /** Field value overrides */
  init?: Record<string, string>
  overrides: Record<string, string>
  responses: GuidedResponse[]
}

export const guidedApi = {
  createTemplate,
  getTemplates,
  saveTemplate,
  getSessions,
  createSession,
  saveSession,
  removeSession,
  removeTemplate,
}

async function createTemplate(template: Omit<GuidedTemplate, '_id'>) {
  const create: GuidedTemplate = {
    _id: v4(),
    ...template,
  }

  await saveTemplate(create)

  return localApi.result(create)
}

async function getTemplates() {
  const all = (await storage.getItem(KEYS.templates)) || '[]'
  const templates = JSON.parse(all) as GuidedTemplate[]
  for (const template of templates) {
    template.lists ??= {}
  }
  return localApi.result({ templates })
}

async function saveTemplate(template: GuidedTemplate) {
  const create = { ...template }
  if (!create._id) {
    create._id = v4()
  }

  const { result } = await getTemplates()
  const next = result.templates.filter((t) => t._id !== template._id).concat(create)

  await storage.setItem(KEYS.templates, JSON.stringify(next))
  return localApi.result(template)
}

async function getSessions() {
  const json = (await storage.getItem(KEYS.sessions)) || '[]'
  const sessions = JSON.parse(json) as GuidedSession[]
  return localApi.result({ sessions })
}

async function saveSession(session: GuidedSession) {
  const update = { ...session }
  if (!update._id) {
    update._id = v4()
  }

  const sessions = await getSessions()
  const next = sessions.result.sessions.filter((s) => s._id !== session._id)
  next.push(update)
  await storage.setItem(KEYS.sessions, JSON.stringify(next))
  return localApi.result({ sessions: next, session: update })
}

async function createSession(gameId: string) {
  const session: GuidedSession = {
    _id: v4(),
    gameId,
    overrides: {},
    responses: [],
  }

  const { result } = await getSessions()
  const next = result.sessions.concat(session)
  await storage.setItem(KEYS.sessions, JSON.stringify(next))
  return session
}

async function removeTemplate(id: string) {
  const { result } = await getTemplates()
  const next = result.templates.filter((s) => s._id !== id)
  await storage.setItem(KEYS.templates, JSON.stringify(next))

  return localApi.result({ templates: next })
}

async function removeSession(id: string) {
  const { result } = await getSessions()
  const next = result.sessions.filter((s) => s._id !== id)
  await storage.setItem(KEYS.sessions, JSON.stringify(next))

  return localApi.result({ sessions: next })
}
