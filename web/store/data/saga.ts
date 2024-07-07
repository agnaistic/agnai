import { v4 } from 'uuid'
import { storage } from '/web/shared/util'
import { localApi } from './storage'
import { now } from '/common/util'
import { Saga } from '/common/types'

const KEYS = {
  templates: 'agnai-guided-templates',
  sessions: 'agnai-guided-sessions',
}

export const sagaApi = {
  createTemplate,
  getTemplates,
  saveTemplate,
  getSessions,
  createSession,
  saveSession,
  removeSession,
  removeTemplate,
}

async function createTemplate(template: Omit<Saga.Template, '_id'>) {
  const create: Saga.Template = {
    ...template,
    _id: v4(),
  }

  await saveTemplate(create)

  return localApi.result(create)
}

async function getTemplates() {
  const all = (await storage.getItem(KEYS.templates)) || '[]'
  const templates = JSON.parse(all) as Saga.Template[]
  for (const template of templates) {
    template.lists ??= {}
  }
  return localApi.result({ templates })
}

async function saveTemplate(template: Saga.Template) {
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
  const sessions = JSON.parse(json) as Saga.Session[]

  for (const sess of sessions) {
    if (!sess._id || sess._id === 'new') {
      sess._id = v4()
    }

    if (!sess.templateId) {
      sess.templateId = sess.gameId!
      delete sess.gameId
    }
  }

  await storage.setItem(KEYS.sessions, JSON.stringify(sessions))

  return localApi.result({ sessions })
}

async function saveSession(session: Saga.Session) {
  const update = { ...session }
  if (!update._id || update._id === 'new') {
    update._id = v4()
  }

  const sessions = await getSessions()
  const next = sessions.result.sessions.filter((s) => s._id !== session._id)
  next.push(update)
  await storage.setItem(KEYS.sessions, JSON.stringify(next))
  return localApi.result({ sessions: next, session: update })
}

async function createSession(templateId: string) {
  const session: Saga.Session = {
    _id: v4(),
    format: 'Alpaca',
    userId: '',
    templateId,
    overrides: {},
    responses: [],
    updated: now(),
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
