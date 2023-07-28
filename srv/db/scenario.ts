import { v4 } from 'uuid'
import { db } from './client'
import { AppSchema, NewScenario } from '/common/types'

export async function getScenarios(userId: string) {
  const books = await db('scenario').find({ userId }).toArray()
  return books
}

export async function getScenariosById(ids: string[]) {
  const books = await db('scenario')
    .find({ _id: { $in: ids } })
    .toArray()
  return books
}

export async function createScenario(userId: string, scenario: NewScenario) {
  const newScenario: AppSchema.ScenarioBook = {
    _id: v4(),
    kind: 'scenario',
    userId,
    name: scenario.name,
    description: scenario.description,
    text: scenario.text,
    overwriteCharacterScenario: scenario.overwriteCharacterScenario,
    instructions: scenario.instructions,
    entries: scenario.entries.map((entry) => ({
      name: entry.name,
      requires: entry.requires,
      assigns: entry.assigns,
      type: entry.type,
      text: entry.text,
      trigger: entry.trigger,
    })),
    states: [],
  }

  await db('scenario').insertOne(newScenario)
  return newScenario
}

export async function updateScenario(userId: string, scenarioId: string, scenario: NewScenario) {
  await db('scenario').updateOne(
    { _id: scenarioId, userId },
    {
      $set: {
        name: scenario.name,
        description: scenario.description,
        text: scenario.text,
        overwriteCharacterScenario: scenario.overwriteCharacterScenario,
        instructions: scenario.instructions,
        entries: scenario.entries,
        states: scenario.states,
      },
    }
  )
}

export async function deleteScenario(userId: string, scenarioId: string) {
  await db('scenario').deleteOne({ _id: scenarioId, userId })
}

export async function getScenario(scenarioId: string) {
  const book = await db('scenario').findOne({ _id: scenarioId })

  if (!book) return
  return book
}
