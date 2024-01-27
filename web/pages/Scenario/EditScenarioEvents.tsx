import {
  Component,
  For,
  Index,
  Match,
  Show,
  Switch,
  createEffect,
  createMemo,
  createSignal,
  onMount,
} from 'solid-js'
import { scenarioStore } from '../../store'
import Button from '../../shared/Button'
import { ChevronDown, ChevronUp, Plus, Save, X } from 'lucide-solid'
import { useNavigate } from '@solidjs/router'
import TextInput from '../../shared/TextInput'
import { AppSchema, NewScenario } from '/common/types'
import Accordian from '/web/shared/Accordian'
import Select from '/web/shared/Select'
import RangeInput from '/web/shared/RangeInput'
import { getForm, getStrictForm } from '/web/shared/util'
import TagInput from '/web/shared/TagInput'
import PromptEditor from '/web/shared/PromptEditor'
import { FormLabel } from '/web/shared/FormLabel'
import { Card, Pill, TitleCard } from '/web/shared/Card'
import { TFunction } from 'i18next'
import { Trans, useTransContext } from '@mbarzda/solid-i18next'

const eventTypeOptions = (t: TFunction) => [
  { value: 'hidden', label: t('hidden_not_shown_to_the_user') },
  { value: 'world', label: t('world_shown_external_to_the_character') },
  { value: 'character', label: t('character_shown_though_or_action_by_the_character') },
  { value: 'ooc', label: t('out_of_character_only_visible_by_the_user') },
]

const triggerTypeOptions = (t: TFunction) => [
  {
    value: 'onGreeting',
    label: t('greeting'),
  },
  {
    value: 'onManualTrigger',
    label: t('manual_trigger'),
  },
  {
    value: 'onChatOpened',
    label: t('chat_opened'),
  },
  {
    value: 'onCharacterMessageReceived',
    label: t('message_received'),
  },
]

const EditScenarioEvents: Component<{ editId: string; form: HTMLFormElement }> = (props) => {
  const [t] = useTransContext()

  const nav = useNavigate()
  const state = scenarioStore((x) => ({
    loading: x.loading,
    scenario: x.scenarios.find((s) => s._id === props.editId),
  }))

  const [entries, setEntries] = createSignal<AppSchema.ScenarioEvent[]>([])

  const availableStates = createMemo(() => {
    const states = new Set<string>()

    for (const entry of entries()) {
      for (const state of entry.assigns.concat(entry.requires)) {
        if (state.startsWith('!')) continue
        states.add(state)
      }
    }

    for (const state of Array.from(states)) {
      states.add(`!${state}`)
    }

    return Array.from(states)
  })

  onMount(() => {
    scenarioStore.getAll()
  })

  const invalidStates = createMemo(() => {
    const bad = new Set<string>()
    const mod = availableStates()
    const set = new Set(mod)

    for (const entry of entries()) {
      const both = entry.requires.concat(entry.assigns)
      for (const tag of both) {
        if (!set.has(tag)) bad.add(tag)
      }
    }

    return Array.from(bad.keys())
  })

  createEffect(() => {
    setEntries(state.scenario?.entries || [])
  })

  const updateEntry = <T extends AppSchema.ScenarioEventTrigger = AppSchema.ScenarioEventTrigger>(
    index: number,
    update: Partial<AppSchema.ScenarioEvent<T>>
  ) => {
    setEntries((prev) => {
      return prev.map((entry, i) => (index !== i ? entry : { ...entry, ...update }))
    })
  }

  const addEntry = () => {
    const requiresGreeting =
      state.scenario?.overwriteCharacterScenario &&
      !entries().some((e) => e.trigger.kind === 'onGreeting')
    const newEvent: AppSchema.ScenarioEvent = {
      name: requiresGreeting ? t('greeting') : '',
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
        break

      case 'onCharacterMessageReceived':
        trigger = {
          kind: 'onCharacterMessageReceived',
          minMessagesSinceLastEvent: 5,
        }
        break
    }
    const newEntry = { ...entry, trigger }
    setEntries(entries().map((e) => (e === entry ? newEntry : e)))
  }

  const onSubmit = () => {
    if (!state.scenario) return

    const body = getStrictForm(props.form, {
      name: 'string',
      description: 'string?',
      text: 'string',
      overwriteCharacterScenario: 'boolean',
      instructions: 'string?',
    })

    const inputs = getForm<any>(props.form)

    const ents = entries()

    for (let i = 0; i < ents.length; i++) {
      const entry = ents[i]
      entry.name = inputs['name.' + i]
      entry.text = inputs['text.' + i]
      entry.type = inputs['type.' + i]
      entry.trigger.kind = inputs['trigger-kind.' + i]

      switch (entry.trigger.kind) {
        case 'onManualTrigger':
          entry.trigger.probability = +inputs['trigger-probability.' + i]
          break

        case 'onCharacterMessageReceived':
          entry.trigger.minMessagesSinceLastEvent =
            +inputs['trigger-minMessagesSinceLastEvent.' + i]
          break

        case 'onChatOpened':
          entry.trigger.awayHours = +inputs['trigger-awayHours.' + i]
          break
      }
    }

    const update: NewScenario = {
      name: body.name,
      description: body.description,
      text: body.text,
      states: [],
      overwriteCharacterScenario: body.overwriteCharacterScenario,
      instructions: body.instructions,
      entries: ents,
    }

    scenarioStore.update(state.scenario._id, update)
  }

  return (
    <>
      <EventsHelp />

      <FormLabel
        label={t('states_used')}
        helperText={t('the_states_you_have_used_in_your_events_so_far')}
      />
      <div class="flex gap-2">
        <For each={availableStates()}>
          {(state) => {
            if (state.startsWith('!')) return null
            return <Pill type="hl">{state}</Pill>
          }}
        </For>
      </div>

      <div class="relative flex flex-col gap-4">
        <div class="sticky top-0 z-[1] flex items-center justify-between rounded-md bg-[var(--bg-900)] p-2">
          <div class="text-lg font-bold">{t('events')}</div>
          <Button onClick={addEntry}>
            <Plus /> {t('create_event')}
          </Button>
        </div>

        <Switch>
          <Match when={!entries().length}>
            <div class="mt-16 flex w-full justify-center rounded-full text-xl">
              {t('You have no events yet.')}
            </div>
          </Match>

          <Match when={true}>
            <Index each={entries()}>
              {(entry, index) => (
                <Accordian
                  open={!entry().text}
                  title={
                    <div class={`mb-1 flex w-full items-start justify-between gap-2`}>
                      <TextInput
                        fieldName={`name.${index}`}
                        required
                        class="border-[1px]"
                        parentClass="w-full"
                        value={entry().name}
                        placeholder={t('event_name_with_example')}
                        onChange={(ev) => updateEntry(index, { name: ev.currentTarget.value })}
                      />
                      <div class="flex gap-2">
                        <div class="ml-2 flex flex-col justify-center space-y-1">
                          <Show when={index !== 0}>
                            <button class="ml-2" onClick={() => moveItem(index, -1)}>
                              <ChevronUp size={16} />
                            </button>
                          </Show>
                          <Show when={index !== entries().length - 1}>
                            <button class="ml-2" onClick={() => moveItem(index, 1)}>
                              <ChevronDown size={16} />
                            </button>
                          </Show>
                        </div>
                        <Button
                          schema="clear"
                          class="icon-button"
                          onClick={() => removeEntry(entry())}
                        >
                          <X />
                        </Button>
                      </div>
                    </div>
                  }
                >
                  <div class="flex flex-col gap-2 p-4">
                    <Card>
                      <Select
                        fieldName={`trigger-kind.${index}`}
                        label="Trigger"
                        items={triggerTypeOptions(t)}
                        value={entry().trigger.kind}
                        onChange={(option) =>
                          changeTriggerKind(entry(), option.value as AppSchema.ScenarioTriggerKind)
                        }
                      />
                      <FormLabel
                        label={t('required_states')}
                        helperText={t(
                          'which_states_are_required_before_this_event_can_be_triggered'
                        )}
                      />
                      <TagInput
                        fieldName={`requires.${index}`}
                        disabled={entry().trigger.kind === 'onGreeting'}
                        availableTags={availableStates()}
                        value={entry().requires || []}
                        placeholder={t('states_required_to_trigger')}
                        onSelect={(ev) => updateEntry(index, { requires: ev })}
                      />
                      <FormLabel
                        label={t('states_to_assign')}
                        helperText={t('When triggered, which states will be assigned to the chat')}
                      />
                      <TagInput
                        fieldName={`assigns.${index}`}
                        availableTags={availableStates()}
                        value={entry().assigns}
                        placeholder={t('states_to_add_when_triggered')}
                        onSelect={(ev) => updateEntry(index, { assigns: ev })}
                      />
                    </Card>
                    <Card>
                      <Select
                        fieldName={`type.${index}`}
                        label={t('type')}
                        helperText={t('How will this event be shown to the user.')}
                        items={eventTypeOptions(t)}
                        value={entry().type}
                        onChange={(ev) => updateEntry(index, { type: ev.value as any })}
                      />
                    </Card>

                    <FormLabel
                      label={t('prompt_text')}
                      helperText={t('the_prompt_text_to_send_whenever_this_event_occurs')}
                    />
                    <PromptEditor
                      fieldName={`text.${index}`}
                      showHelp
                      placeholder={t('prompt_editor_example')}
                      hideHelperText
                      noDummyPreview
                      value={entry().text}
                      onChange={(ev) => updateEntry(index, { text: ev })}
                      include={['char', 'user', 'random', 'roll', 'idle_duration', 'chat_age']}
                    />

                    <Switch>
                      <Match when={entry().trigger.kind === 'onGreeting'}>
                        <TitleCard>{t('automatically_sent_when_starting_a_new_chat')}</TitleCard>
                      </Match>

                      <Match when={entry().trigger.kind === 'onManualTrigger'}>
                        <Card>
                          <RangeInput
                            fieldName={`trigger-probability.${index}`}
                            label={t('probability')}
                            helperText={t('manual_triggers_will_be_randomly_selected')}
                            value={(entry().trigger as AppSchema.ScenarioOnManual).probability}
                            min={0}
                            max={100}
                            step={0.01}
                            onChange={(ev) =>
                              updateEntry(index, {
                                trigger: { kind: 'onManualTrigger', probability: ev },
                              })
                            }
                          />
                        </Card>
                      </Match>

                      <Match when={entry().trigger.kind === 'onChatOpened'}>
                        <Card>
                          <RangeInput
                            fieldName={`trigger-awayHours.${index}`}
                            label={t('after_hours')}
                            helperText={t('after_how_many_hours_should_this_trigger_be_activated')}
                            value={(entry().trigger as AppSchema.ScenarioOnChatOpened).awayHours}
                            min={0}
                            max={24 * 7}
                            step={1}
                            onChange={(ev) =>
                              updateEntry(index, {
                                trigger: { kind: 'onChatOpened', awayHours: ev },
                              })
                            }
                          />
                        </Card>
                      </Match>

                      <Match when={entry().trigger.kind === 'onCharacterMessageReceived'}>
                        <Card>
                          <RangeInput
                            fieldName={`trigger-minMessagesSinceLastEvent.${index}`}
                            label={t('after_messages_since_last_event')}
                            helperText={t(
                              'after_how_many_message_should_this_trigger_be_activated'
                            )}
                            value={
                              (entry().trigger as AppSchema.ScenarioOnCharacterMessageRx)
                                .minMessagesSinceLastEvent
                            }
                            min={2}
                            max={100}
                            step={1}
                            onChange={(ev) =>
                              updateEntry(index, {
                                trigger: {
                                  kind: 'onCharacterMessageReceived',
                                  minMessagesSinceLastEvent: ev,
                                },
                              })
                            }
                          />
                        </Card>
                      </Match>
                    </Switch>
                  </div>
                </Accordian>
              )}
            </Index>
          </Match>
        </Switch>

        <div class="mt-4 flex justify-end gap-2">
          <Button onClick={() => nav(`/memory?tab=1`)} schema="secondary">
            <X />
            {t('cancel')}
          </Button>
          <Button onClick={onSubmit} disabled={state.loading || invalidStates().length > 0}>
            <Save />
            {t('update')}
          </Button>
        </div>
      </div>
    </>
  )
}

export default EditScenarioEvents

const EventsHelp: Component = () => {
  const [t] = useTransContext()

  return (
    <Accordian
      class="mb-2 bg-[var(--bg-800)]"
      open={false}
      titleClickOpen
      title={<div class="text-lg font-bold">{t('scenario_events_help')}</div>}
    >
      <div class="space-y-4">
        <p>{t('events_are_triggers_when')}</p>
        <ul class="list-inside list-disc">
          <li>
            <Trans key="events_are_triggers_item_1">
              <code>Greeting</code>: The very first time the user starts a chat
            </Trans>
          </li>
          <li>
            <Trans key="events_are_triggers_item_2">
              <code>Manual Trigger</code>: When the user uses the <i>Trigger Event</i> menu in the
              chat.
            </Trans>
          </li>
          <li>
            <Trans key="events_are_triggers_item_3">
              <code>Chat Opened</code>: When the user opens a chat with a character after some time.
            </Trans>
          </li>
          <li>
            <Trans key="events_are_triggers_item_4">
              <code>Message Received</code>: When the character writes something.
            </Trans>
          </li>
        </ul>
        <p>{t('whenever_an_event_is_triggered')}</p>
        <ul class="list-inside list-disc">
          <li>
            <Trans key="whenever_an_event_is_triggered_item_1">
              <code>World</code>: The event will be shown as if something happened independently of
              the character.
            </Trans>
          </li>
          <li>
            <Trans key="whenever_an_event_is_triggered_item_2">
              <code>Character</code>: The event will be shown as if the character wrote it, for
              example if the character does something.
            </Trans>
          </li>
          <li>
            <Trans key="whenever_an_event_is_triggered_item_3">
              <code>Hidden</code>: The event will be hidden from the user. This is useful to make
              the character do something, and make it look like it was on their own initiative.
            </Trans>
          </li>
          <li>
            <Trans key="whenever_an_event_is_triggered_item_4">
              <code>OOC</code>: The event will be hidden from the character. This is useful to give
              information or clues to the user.
            </Trans>
          </li>
        </ul>
        <p>{t('the_prompt_text_will_have_processing')}</p>
        <ul class="list-inside list-disc">
          <li>
            <Trans key="the_prompt_text_will_have_processing_item_1">
              The <code>{'{{char}}'}</code> and <code>{'{{user}}'}</code> placeholders will be
              replaced.
            </Trans>
          </li>
          <li>
            <Trans key="the_prompt_text_will_have_processing_item_2">
              Any text with <code>(OOC: TEXT)</code> will be hidden from the user, so you can add
              additional instructions for the character.
            </Trans>
          </li>
          <li>
            <Trans key="the_prompt_text_will_have_processing_item_3">
              It is recommended to wrap your text in <code>*asterisks*</code> unless you want the
              character to <i>say</i> the prompt text.
            </Trans>
          </li>
        </ul>
        <p>
          <Trans key="the_prompt_text_will_have_processing_item_4">
            Finally, you can use the states to control which events are triggered under which
            conditions. The chat will keep track of a list of <i>states</i>, which can be assigned
            by events.
          </Trans>
        </p>
        <ul class="list-inside list-disc">
          <li>
            <Trans key="the_prompt_text_will_have_processing_item_5">
              Required states are states that must exist in the chat to allow the trigger to run.
              You can also prefix a required state by <code>!</code> to require the state <i>not</i>
              to exist in the chat for the event to run. You can specify multiple states by
              separating them with a comma.
            </Trans>
          </li>
          <li>
            <Trans key="the_prompt_text_will_have_processing_item_6">
              Assigned states are states that will be added to the chat whenever the event is
              triggered. You can also prefix an assigned state by <code>!</code> to <i>remove</i>
              the state from the chat. You can specify multiple states by separating them with a
              comma.
            </Trans>
          </li>
        </ul>
        <p>{t('when_multiple_events_can_run_they_will_be_randomly_selected')}</p>
      </div>
    </Accordian>
  )
}
