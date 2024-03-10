import { createStore } from './create'
import { msgStore } from './message'
import { BOT_REPLACE, SELF_REPLACE } from '../../common/prompt'
import { userStore } from './user'
import { AppSchema } from '/common/types'
import { scenarioStore } from './scenario'
import { toastStore } from './toasts'
import { chatStore } from './chat'
import { weightedRandom } from '../shared/util'

export type ChatEvent = {
  charId: string
  chatId: string
  prompt: string
  event: AppSchema.ScenarioEventType
}

type ChatEventState = {
  events: ChatEvent[]
  preventLoop: boolean
}

type EventAndTrigger<T extends AppSchema.ScenarioEventTrigger> = {
  event: AppSchema.ScenarioEvent
  trigger: T
}

export const eventStore = createStore<ChatEventState>('events', { events: [], preventLoop: false })(
  (get, set) => {
    return {
      onGreeting(_, chat: AppSchema.Chat) {
        if (!chat.scenarioIds?.length) return
        try {
          const scenarios = scenarioStore
            .getState()
            .scenarios.filter((s) => chat.scenarioIds?.includes(s._id))

          for (const scenario of scenarios) {
            if (!scenario.instructions) continue
            msgStore.queue(
              chat._id,
              `**Scenario: ${scenario.name}**\nInstructions: ${scenario.instructions}`,
              'ooc'
            )
          }

          // Greeting
          const entries = scenarios.flatMap((s) => s.entries)
          const event = selectOnGreetingEvent(entries, chat.scenarioStates || [])
          if (event) executeEvent(chat, event)
        } catch (e: any) {
          toastStore.error(`Error while creating the greeting message: ${e.message}`)
        }
      },
      onChatOpened(_, chat: AppSchema.Chat, lastMessageDate: Date) {
        if (!chat.scenarioIds?.length) return
        const scenarios = scenarioStore
          .getState()
          .scenarios.filter((s) => chat.scenarioIds?.includes(s._id))
        const entries = scenarios.flatMap((s) => s.entries)
        const event = selectOnChatOpenedEvent(entries, chat.scenarioStates || [], lastMessageDate)
        if (event) executeEvent(chat, event)
      },
      *onCharacterMessageReceived(
        { preventLoop },
        chat: AppSchema.Chat,
        messagesSinceLastEvent: number
      ) {
        if (preventLoop) {
          yield { preventLoop: false }
          return
        }
        if (!chat.scenarioIds?.length) return
        const scenarios = scenarioStore
          .getState()
          .scenarios.filter((s) => chat.scenarioIds?.includes(s._id))
        const entries = scenarios.flatMap((s) => s.entries)
        const event = selectOnCharacterMessageReceivedEvent(
          entries,
          chat.scenarioStates || [],
          messagesSinceLastEvent
        )
        if (event) {
          yield { preventLoop: true }
          if (event) executeEvent(chat, event)
        }
      },
      async triggerEvent(_, chat: AppSchema.Chat, char?: AppSchema.Character) {
        const scenarios = scenarioStore
          .getState()
          .scenarios.filter((s) => chat.scenarioIds?.includes(s._id))
        if (scenarios.length == 0) {
          toastStore.error('No scenarios found')
        }
        const states = chat.scenarioStates || []

        const applicableEvents = filterApplicableEvents<AppSchema.ScenarioOnManual>(
          scenarios.flatMap((s) => s.entries),
          'onManualTrigger',
          states
        )

        const selected = weightedRandom(applicableEvents, (e) => e.trigger.probability)

        if (!selected) {
          toastStore.warn('No events left to trigger')
          return
        }

        const profile = userStore.getState().profile

        let prompt = selected.event.text.replace(SELF_REPLACE, profile?.handle || 'You')
        if (char) {
          prompt = prompt.replace(BOT_REPLACE, char.name)
        }

        const eventState = {
          charId: chat.characterId,
          chatId: chat._id,
          prompt: prompt,
          event: selected.event.type,
        } as ChatEvent
        msgStore.send(
          eventState.chatId,
          eventState.prompt,
          ('send-event:' + eventState.event) as any
        )

        updateChatScenarioStates(chat, selected.event.assigns)

        const updated = { events: [...get().events, eventState] }
        set(updated)
        return updated
      },
    }
  }
)

export function filterApplicableEvents<T extends AppSchema.ScenarioEventTrigger>(
  events: AppSchema.ScenarioEvent[],
  kind: AppSchema.ScenarioTriggerKind,
  states: string[],
  filterPredicate?: (e: EventAndTrigger<T>) => boolean
): EventAndTrigger<T>[] {
  const mapped = events
    .map((e) => ({
      event: e,
      trigger: e.trigger.kind === kind ? e.trigger : undefined,
    }))
    .filter((e) => !!e.trigger) as Array<{ event: AppSchema.ScenarioEvent; trigger: T }>

  return mapped.filter((e) => {
    const additional = filterPredicate?.(e) ?? true
    if (!e.event.requires.length) return additional

    const every = e.event.requires.every((r) =>
      r.startsWith('!') ? !states.includes(r.substring(1)) : states.includes(r)
    )

    return every && additional
  })
}

export function selectOnGreetingEvent(entries: AppSchema.ScenarioEvent[], states: string[]) {
  const applicableEvents = filterApplicableEvents<AppSchema.ScenarioOnGreeting>(
    entries,
    'onGreeting',
    states
  )
  if (applicableEvents.length) {
    const entry = weightedRandom(applicableEvents, () => 1)
    if (entry) return entry.event
  }
}

export function selectOnChatOpenedEvent(
  entries: AppSchema.ScenarioEvent[],
  states: string[],
  lastModified: Date
) {
  const now = new Date()
  const diffInMilliseconds = now.getTime() - lastModified.getTime()
  const diffInHours = diffInMilliseconds / (1000 * 60 * 60)
  const applicableEvents = filterApplicableEvents<AppSchema.ScenarioOnChatOpened>(
    entries,
    'onChatOpened',
    states,
    (e) => e.trigger.awayHours <= diffInHours
  )
  if (applicableEvents.length) {
    const entry = applicableEvents.reduce((prev, curr) =>
      prev.trigger.awayHours > curr.trigger.awayHours ? prev : curr
    )
    if (entry) return entry.event
  }
}

export function selectOnCharacterMessageReceivedEvent(
  entries: AppSchema.ScenarioEvent[],
  states: string[],
  messagesSinceLastEvent: number
) {
  const applicableEvents = filterApplicableEvents<AppSchema.ScenarioOnCharacterMessageRx>(
    entries,
    'onCharacterMessageReceived',
    states,
    (e) => messagesSinceLastEvent >= e.trigger.minMessagesSinceLastEvent
  )
  if (applicableEvents.length) {
    const entry = applicableEvents.reduce((prev, curr) =>
      prev.trigger.minMessagesSinceLastEvent < curr.trigger.minMessagesSinceLastEvent ? prev : curr
    )
    if (entry) return entry.event
  }
}

function executeEvent(chat: AppSchema.Chat, event: AppSchema.ScenarioEvent) {
  updateChatScenarioStates(chat, event.assigns)
  msgStore.queue(chat._id, event.text, `send-event:${event.type}`)
}

function updateChatScenarioStates(chat: AppSchema.Chat, assigns: string[]) {
  const chatStates = chat.scenarioStates || []
  if (assigns.length) {
    const add = assigns.filter((s) => !s.startsWith('!'))
    const remove = assigns.filter((s) => s.startsWith('!')).map((s) => s.slice(1))
    const updatedStates = Array.from(
      new Set(chatStates.filter((s) => !remove.includes(s)).concat(add))
    )
    const equivalent =
      chatStates.length === updatedStates.length &&
      chatStates.every((val) => updatedStates.includes(val))

    if (!equivalent) {
      chatStore.updateChatScenarioStates(chat._id, updatedStates)
    }
  }
}
