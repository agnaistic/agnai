import { Router } from 'express'
import { store } from '../../db'
import { loggedIn } from '../auth'
import { errors, handle } from '../wrap'
import { assertValid } from '/common/valid'
import { AppSchema, NewScenario } from '/common/types'

const router = Router()

const validateOnGreetingTrigger = {
  kind: 'string',
} as const

const validateOnManualTriggerTrigger = {
  kind: 'string',
  probability: 'number',
} as const

const validateOnChatOpenedTrigger = {
  kind: 'string',
  awayHours: 'number',
} as const

const validateOnCharacterMessageReceivedTrigger = {
  kind: 'string',
  minMessagesSinceLastEvent: 'number',
} as const

const validEntry = {
  name: 'string',
  requires: ['string'],
  assigns: ['string'],
  type: 'string',
  text: 'string',
  trigger: 'any',
} as const

const validScenario = {
  name: 'string',
  states: ['string'],
  description: 'string?',
  text: 'string',
  overwriteCharacterScenario: 'boolean',
  instructions: 'string?',
  entries: [validEntry],
} as const

const getUserScenarios = handle(async ({ userId }) => {
  const scenarios = await store.scenario.getScenarios(userId!)
  return { scenarios }
})

const getScenario = handle(async ({ userId, params }) => {
  const id = params.id
  const scenario = await store.scenario.getScenario(id!)
  if (scenario?.userId !== userId) throw errors.Unauthorized
  return scenario
})

const createScenario = handle(async ({ body, userId }) => {
  assertScenario(body)

  const newScenario = await store.scenario.createScenario(userId!, body as NewScenario)

  return newScenario
})

const updateScenario = handle(async ({ body, userId, params }) => {
  const id = params.id
  assertScenario(body)
  await store.scenario.updateScenario(userId!, id!, body)

  return { success: true }
})

const removeScenario = handle(async ({ userId, params }) => {
  await store.scenario.deleteScenario(userId, params.id)
  return { success: true }
})

router.get('/', loggedIn, getUserScenarios)
router.post('/', loggedIn, createScenario)
router.get('/:id', loggedIn, getScenario)
router.put('/:id', loggedIn, updateScenario)
router.delete('/:id', loggedIn, removeScenario)

export default router

function assertScenario(body: any) {
  assertValid(validScenario, body)
  body.entries = body.entries.map((entry: any) => ({
    ...entry,
    trigger: assertTrigger(entry.trigger),
  }))
}

function assertTrigger(body: any) {
  switch (body.kind as AppSchema.ScenarioTriggerKind) {
    case 'onGreeting':
      assertValid(validateOnGreetingTrigger, body)
      return body
    case 'onManualTrigger':
      assertValid(validateOnManualTriggerTrigger, body)
      return body
    case 'onChatOpened':
      assertValid(validateOnChatOpenedTrigger, body)
      return body
    case 'onCharacterMessageReceived':
      assertValid(validateOnCharacterMessageReceivedTrigger, body)
      return body
    default:
      throw errors.BadRequest
  }
}
