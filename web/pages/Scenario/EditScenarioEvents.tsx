import { Component, For, Match, Show, Switch, createEffect, createSignal, onMount } from 'solid-js'
import { scenarioStore } from '../../store'
import PageHeader from '../../shared/PageHeader'
import Button from '../../shared/Button'
import { ArrowLeft, ChevronDown, ChevronUp, Plus, Save, X } from 'lucide-solid'
import { useNavigate, useParams } from '@solidjs/router'
import TextInput from '../../shared/TextInput'
import { AppSchema } from '/common/types'
import Accordian from '/web/shared/Accordian'
import Select, { Option } from '/web/shared/Select'
import RangeInput from '/web/shared/RangeInput'
import { getFormEntries } from '/web/shared/util'

const eventTypeOptions: Option<AppSchema.EventTypes>[] = [
  { value: 'hidden', label: 'Hidden (not shown to the user)' },
  { value: 'world', label: 'World (shown, external to the character)' },
  { value: 'character', label: 'Character (shown, thought or action by the character)' },
  { value: 'ooc', label: 'Out Of Character (only visible by the user)' },
]

const triggerTypeOptions: Option<AppSchema.ScenarioTriggerKind>[] = [
  {
    value: 'onGreeting',
    label: 'Greeting',
  },
  {
    value: 'onManualTrigger',
    label: 'Manual Trigger',
  },
  {
    value: 'onChatOpened',
    label: 'Chat Opened',
  },
  {
    value: 'onCharacterMessageReceived',
    label: 'Message Received',
  },
]

const CreateScenario: Component = () => {
  let ref: any
  const nav = useNavigate()
  const params = useParams<{ editId: string }>()
  const state = scenarioStore((x) => ({
    loading: x.loading,
    scenario: x.scenarios.find((s) => s._id === params.editId),
  }))

  const [entries, setEntries] = createSignal<AppSchema.ScenarioEvent[]>([])

  onMount(() => {
    scenarioStore.getAll()
  })

  createEffect(() => {
    setEntries(state.scenario?.entries || [])
  })

  const parseStates = (value: string) => {
    return value
      .split(',')
      .map((s) => s.trim())
      .filter((s) => !!s)
  }

  const addEntry = () => {
    const requiresGreeting =
      state.scenario?.overwriteCharacterScenario &&
      !entries().some((e) => e.trigger.kind === 'onGreeting')
    const newEvent: AppSchema.ScenarioEvent = {
      name: requiresGreeting ? 'Greeting' : '',
      type: 'world',
      text: '',
      requires: [],
      assigns: [],
      trigger: requiresGreeting
        ? { kind: 'onGreeting' }
        : {
            kind: 'onManualTrigger',
            probability: 1,
          },
    }
    setEntries([...entries(), newEvent])
  }

  const moveItem = (index: number, direction: number) => {
    const newItems = [...entries()]
    const itemToMove = newItems.splice(index, 1)[0]
    newItems.splice(index + direction, 0, itemToMove)
    setEntries(newItems)
  }

  const removeEntry = (entry: AppSchema.ScenarioEvent) => {
    setEntries(entries().filter((e) => e !== entry))
  }

  const changeTriggerKind = (
    entry: AppSchema.ScenarioEvent,
    kind: AppSchema.ScenarioTriggerKind
  ) => {
    let trigger: AppSchema.ScenarioEventTrigger
    switch (kind) {
      case 'onGreeting':
        trigger = {
          kind: 'onGreeting',
        }
        break
      case 'onManualTrigger':
        trigger = {
          kind: 'onManualTrigger',
          probability: 1,
        }
        break
      case 'onChatOpened':
        trigger = {
          kind: 'onChatOpened',
          awayHours: 2,
        }
      case 'onCharacterMessageReceived':
        trigger = {
          kind: 'onCharacterMessageReceived',
          minMessagesSinceLastEvent: 5,
        }
    }
    const newEntry = { ...entry, trigger }
    setEntries(entries().map((e) => (e === entry ? newEntry : e)))
  }

  const onSubmit = (ev: Event) => {
    ev.preventDefault()
    if (!state.scenario) return

    const inputs = getFormEntries(ref)

    const map = new Map<string, AppSchema.ScenarioEvent>()
    for (const [key, value] of inputs) {
      const [prop, i] = key.split('.')
      if (i === undefined) continue

      const prev = map.get(i) || ({ trigger: {} } as AppSchema.ScenarioEvent)

      switch (prop) {
        case 'name':
        case 'text':
          prev[prop] = value
          break

        case 'requires':
        case 'assigns':
          prev[prop] = parseStates(value)
          break

        case 'type':
          prev[prop] = value as AppSchema.EventTypes
          break

        case 'trigger-kind':
          prev.trigger.kind = value as AppSchema.ScenarioTriggerKind
          break

        case 'trigger-probability':
          ;(prev.trigger as AppSchema.ScenarioOnManual).probability = +value
          break

        case 'trigger-awayHours':
          ;(prev.trigger as AppSchema.ScenarioOnChatOpened).awayHours = +value
          break

        case 'trigger-minMessagesSinceLastEvent':
          ;(prev.trigger as AppSchema.ScenarioOnCharacterMessageRx).minMessagesSinceLastEvent =
            +value
          break
      }

      map.set(i, prev)
    }

    const entries = Array.from(map.values())

    const update = { ...state.scenario, entries }

    scenarioStore.update(state.scenario._id, update)
  }

  return (
    <>
      <PageHeader
        title={
          <div class="flex w-full justify-between">
            <div>Edit Scenario Events</div>
            <div class="flex text-base">
              <div class="px-1">
                <Button schema="secondary" onClick={() => nav(`/scenario/${params.editId}`)}>
                  <ArrowLeft />
                  <span class="hidden sm:inline">Back</span>
                </Button>
              </div>
            </div>
          </div>
        }
      />

      <Accordian
        class="mb-2 bg-[var(--bg-800)]"
        open={false}
        title={<div class="text-lg font-bold">Scenario Events Help</div>}
      >
        <div class="space-y-4">
          <p>Events are triggers when:</p>
          <ul class="list-inside list-disc">
            <li>
              <code>Greeting</code>: The very first time the user starts a chat
            </li>
            <li>
              <code>Manual Trigger</code>: When the user uses the <i>Trigger Event</i> menu in the
              chat
            </li>
            <li>
              <code>Chat Opened</code>: When the user opens a chat with a character after some time
            </li>
            <li>
              <code>Message Received</code>: When the character writes something
            </li>
          </ul>
          <p>Whenever an event is triggered, a prompt will be sent to the character.</p>
          <ul class="list-inside list-disc">
            <li>
              <code>World</code>: The event will be shown as if something happened independently of
              the character.
            </li>
            <li>
              <code>Character</code>: The event will be shown as if the character wrote it, for
              example if the character does something.
            </li>
            <li>
              <code>Hidden</code>: The event will be hidden from the user. This is useful to make
              the character do something, and make it look like it was on their own initiative.
            </li>
            <li>
              <code>OOC</code>: The event will be hidden from the character. This is useful to give
              information or clues to the user.
            </li>
          </ul>
          <p>The prompt text will have processing.</p>
          <ul class="list-inside list-disc">
            <li>
              The <code>{'{{char}}'}</code> and <code>{'{{user}}'}</code> placeholders will be
              replaced
            </li>
            <li>
              Any text with <code>(OOC: TEXT)</code> will be hidden from the user, so you can add
              additional instructions for the character.
            </li>
            <li>
              It is recommended to wrap your text in <code>*asterisks*</code> unless you want the
              character to <i>say</i> the prompt text.
            </li>
          </ul>
          <p>
            Finally, you can use the states to control which events are triggered under which
            conditions. The chat will keep track of a list of <i>states</i>, which can be assigned
            by events.
          </p>
          <ul class="list-inside list-disc">
            <li>
              Required states are states that must exist in the chat to allow the trigger to run.
              You can also prefix a required state by <code>!</code> to require the state <i>not</i>{' '}
              to exist in the chat for the event to run. You can specify multiple states by
              separating them with a comma.
            </li>
            <li>
              Assigned states are states that will be added to the chat whenever the event is
              triggered. You can also prefix an assigned state by <code>!</code> to <i>remove</i>{' '}
              the state from the chat. You can specify multiple states by separating them with a
              comma.
            </li>
          </ul>
          <p>When multiple events can run, they will be randomly selected.</p>
        </div>
      </Accordian>

      <form class="flex flex-col gap-4" onSubmit={onSubmit} ref={ref}>
        <div class="sticky top-0 z-10 flex items-center justify-between bg-[var(--bg-900)] py-2">
          <div class="text-lg font-bold">Events</div>
          <Button onClick={addEntry}>
            <Plus /> Create Event
          </Button>
        </div>

        <Switch>
          <Match when={!entries().length}>
            <div class="mt-16 flex w-full justify-center rounded-full text-xl">
              You have no events yet.
            </div>
          </Match>

          <Match when={true}>
            <For each={entries()}>
              {(entry, index) => (
                <Accordian
                  open={!entry.text}
                  title={
                    <div class={`mb-1 flex w-full items-center gap-2`}>
                      <Select
                        fieldName={`trigger-kind.${index()}`}
                        items={triggerTypeOptions}
                        value={entry.trigger.kind}
                        onChange={(option) =>
                          changeTriggerKind(entry, option.value as AppSchema.ScenarioTriggerKind)
                        }
                      />
                      <TextInput
                        fieldName={`requires.${index()}`}
                        class="border-[1px]"
                        disabled={entry.trigger.kind === 'onGreeting'}
                        value={entry.requires?.join(', ')}
                        placeholder="States required to trigger"
                        onChange={(ev) => (entry.requires = parseStates(ev.currentTarget.value))}
                      />
                      <TextInput
                        fieldName={`name.${index()}`}
                        required
                        class="border-[1px]"
                        value={entry.name}
                        placeholder='Event name, e.g. "Greeting"'
                        onChange={(ev) => (entry.name = ev.currentTarget.value)}
                      />
                      <TextInput
                        fieldName={`assigns.${index()}`}
                        class="border-[1px]"
                        value={entry.assigns?.join(', ')}
                        placeholder="States to add when triggered"
                        onChange={(ev) => (entry.assigns = parseStates(ev.currentTarget.value))}
                      />
                      <div class="ml-2 flex flex-col space-y-1">
                        <Show when={index() !== 0}>
                          <button class="ml-2" onClick={() => moveItem(index(), -1)}>
                            <ChevronUp size={16} />
                          </button>
                        </Show>
                        <Show when={index() !== entries().length - 1}>
                          <button class="ml-2" onClick={() => moveItem(index(), 1)}>
                            <ChevronDown size={16} />
                          </button>
                        </Show>
                      </div>
                      <Button schema="clear" class="icon-button" onClick={() => removeEntry(entry)}>
                        <X />
                      </Button>
                    </div>
                  }
                >
                  <div class="flex flex-col gap-2 p-4">
                    <Select
                      fieldName={`type.${index()}`}
                      label="Type"
                      helperText="How will this event be shown to the user."
                      items={eventTypeOptions}
                      value={entry.type}
                      onChange={(ev) => (entry.type = ev.value as AppSchema.EventTypes)}
                    />

                    <TextInput
                      fieldName={`text.${index()}`}
                      required
                      label="Prompt Text"
                      helperText="The prompt text to send whenever this event occurs. The (OOC: something) text will be hidden from the user."
                      placeholder="*{{char}} suddenly remembers something important to say to {{user}}!* (OOC: Make up a personal memory with {{user}}.)"
                      value={entry.text}
                      onChange={(ev) => (entry.text = ev.currentTarget.value)}
                    />

                    <Switch>
                      <Match when={entry.trigger.kind === 'onGreeting'}>
                        <>
                          <p>Automatically sent when starting a new chat.</p>
                        </>
                      </Match>

                      <Match when={entry.trigger.kind === 'onManualTrigger'}>
                        <RangeInput
                          fieldName={`trigger-probability.${index()}`}
                          label="Probability"
                          helperText="Manual triggers will be randomly selected, with higher probability for higher values."
                          value={(entry.trigger as AppSchema.ScenarioOnManual).probability}
                          min={0}
                          max={100}
                          step={0.01}
                          onChange={(ev) =>
                            ((entry.trigger as AppSchema.ScenarioOnManual).probability = ev)
                          }
                        />
                      </Match>

                      <Match when={entry.trigger.kind === 'onChatOpened'}>
                        <RangeInput
                          fieldName={`trigger-awayHours.${index()}`}
                          label="After (hours)"
                          helperText="After how many hours should this trigger be activated? The longest trigger will be selected."
                          value={(entry.trigger as AppSchema.ScenarioOnChatOpened).awayHours}
                          min={1}
                          max={24 * 7}
                          step={1}
                          onChange={(ev) =>
                            ((entry.trigger as AppSchema.ScenarioOnChatOpened).awayHours = ev)
                          }
                        />
                      </Match>

                      <Match when={entry.trigger.kind === 'onCharacterMessageReceived'}>
                        <RangeInput
                          fieldName={`trigger-minMessagesSinceLastEvent.${index()}`}
                          label="After (messages since last event)"
                          helperText="After how many message should this trigger be activated? The shortest trigger will be selected."
                          value={
                            (entry.trigger as AppSchema.ScenarioOnCharacterMessageRx)
                              .minMessagesSinceLastEvent
                          }
                          min={2}
                          max={100}
                          step={1}
                          onChange={(ev) =>
                            ((
                              entry.trigger as AppSchema.ScenarioOnCharacterMessageRx
                            ).minMessagesSinceLastEvent = ev)
                          }
                        />
                      </Match>
                    </Switch>
                  </div>
                </Accordian>
              )}
            </For>
          </Match>
        </Switch>

        <div class="mt-4 flex justify-end gap-2">
          <Button onClick={() => nav(`/scenario/${params.editId}`)} schema="secondary">
            <X />
            Cancel
          </Button>
          <Button type="submit" disabled={state.loading}>
            <Save />
            Update
          </Button>
        </div>
      </form>
    </>
  )
}

export default CreateScenario
