import { Component, Show, createEffect } from 'solid-js'
import { Clock, Save } from 'lucide-solid'
import { createStore } from 'solid-js/store'
import { AppSchema } from '/common/types'
import Button from '/web/shared/Button'
import Select from '/web/shared/Select'
import TextInput from '/web/shared/TextInput'
import { Toggle } from '/web/shared/Toggle'
import { chatStore } from '/web/store'

const dateFormats: Array<{ value: AppSchema.SceneClockDateFormat; label: string }> = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
  { value: 'Long', label: 'Long' },
]

const timeFormats: Array<{ value: AppSchema.SceneClockTimeFormat; label: string }> = [
  { value: '12h', label: '12 hour' },
  { value: '24h', label: '24 hour' },
]

export const SceneClockPanel: Component<{ chat?: AppSchema.Chat }> = (props) => {
  const [clock, setClock] = createStore(getInitSceneClock(props.chat?.sceneClock))

  createEffect(() => {
    setClock(getInitSceneClock(props.chat?.sceneClock))
  })

  const save = () => {
    if (!props.chat) return

    chatStore.editChat(
      props.chat._id,
      {
        sceneClock: {
          ...clock,
          date: clock.date.trim(),
          time: clock.time.trim(),
          calendarName: clock.calendarName?.trim(),
          notes: clock.notes?.trim(),
          lastUpdatedBy: 'user',
          lastUpdatedAt: new Date().toISOString(),
        },
      },
      { quiet: true }
    )
  }

  return (
    <Show when={props.chat?.sceneClock?.enabled}>
      <section class="bg-900 border-700 flex flex-col gap-2 rounded-md border p-2 text-sm">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2 font-semibold">
            <Clock size={16} />
            Scene Clock
          </div>
          <Button size="sm" onClick={save}>
            <Save size={14} />
          </Button>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <TextInput
            class="text-xs"
            label="Date"
            value={clock.date}
            placeholder="17/04/1023"
            onChange={(ev) => setClock('date', ev.currentTarget.value)}
          />
          <TextInput
            class="text-xs"
            label="Time"
            value={clock.time}
            placeholder="21:30"
            onChange={(ev) => setClock('time', ev.currentTarget.value)}
          />
        </div>

        <div class="grid grid-cols-2 gap-2">
          <Select
            label="Date Format"
            items={dateFormats}
            value={clock.dateFormat}
            onChange={(ev) => setClock('dateFormat', ev.value as AppSchema.SceneClockDateFormat)}
          />
          <Select
            label="Time Format"
            items={timeFormats}
            value={clock.timeFormat}
            onChange={(ev) => setClock('timeFormat', ev.value as AppSchema.SceneClockTimeFormat)}
          />
        </div>

        <TextInput
          class="text-xs"
          label="Calendar"
          value={clock.calendarName}
          placeholder="Imperial calendar"
          onChange={(ev) => setClock('calendarName', ev.currentTarget.value)}
        />

        <TextInput
          class="text-xs"
          isMultiline
          label="Notes"
          value={clock.notes}
          placeholder="Moons, seasons, time skips..."
          onChange={(ev) => setClock('notes', ev.currentTarget.value)}
        />

        <Toggle
          value={clock.allowAssistantUpdates}
          onChange={(ev) => setClock('allowAssistantUpdates', ev)}
          label="Assistant Update Markup"
          helperText="Allows assistant responses to update the clock using hidden markup."
        />
      </section>
    </Show>
  )
}

function getInitSceneClock(clock?: AppSchema.SceneClock): AppSchema.SceneClock {
  return {
    enabled: clock?.enabled || false,
    date: clock?.date || '',
    time: clock?.time || '',
    dateFormat: clock?.dateFormat || 'YYYY-MM-DD',
    timeFormat: clock?.timeFormat || '24h',
    calendarName: clock?.calendarName || '',
    notes: clock?.notes || '',
    allowAssistantUpdates: clock?.allowAssistantUpdates || false,
    lastUpdatedBy: clock?.lastUpdatedBy,
    lastUpdatedAt: clock?.lastUpdatedAt,
  }
}
