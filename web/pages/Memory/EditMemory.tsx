import { Plus, X } from 'lucide-solid'
import { Component, createEffect, createMemo, createSignal, Index, on, Show } from 'solid-js'
import { AppSchema } from '../../../common/types/schema'
import Accordian from '../../shared/Accordian'
import Button from '../../shared/Button'
import Divider from '../../shared/Divider'
import { FormLabel } from '../../shared/FormLabel'
import Select, { Option } from '../../shared/Select'
import TextInput from '../../shared/TextInput'
import { Toggle } from '../../shared/Toggle'
import { alphaCaseInsensitiveSort } from '../../shared/util'
import { Card } from '/web/shared/Card'
import { SetStoreFunction } from 'solid-js/store'
import { memoryStore } from '/web/store'

const missingFieldsInEntry = (entry: AppSchema.MemoryEntry): (keyof AppSchema.MemoryEntry)[] => [
  ...(entry.keywords.length === 0 ? ['keywords' as const] : []),
  ...(entry.name === '' ? ['name' as const] : []),
  ...(entry.entry === '' ? ['entry' as const] : []),
]

export type EntrySort = 'creationDate' | 'alpha'

const entrySortItems = [
  { label: 'By creation date', value: 'creationDate' },
  { label: 'Alphabetically', value: 'alpha' },
]

const EditMemoryForm: Component<{
  hideSave?: boolean
  updateEntrySort: (opn: Option<string>) => void
  entrySort: EntrySort

  state: AppSchema.MemoryBook
  setter: SetStoreFunction<AppSchema.MemoryBook>

  splitView: boolean
}> = (props) => {
  const [search, setSearch] = createSignal('')
  const [selectedSourceBookId, setSelectedSourceBookId] = createSignal<string>()

  const books = memoryStore()
  const otherBooks = createMemo(() =>
    books.books.list.filter((book) => book._id !== props.state._id)
  )
  const sourceBook = createMemo(() =>
    books.books.list.find((book) => book._id === selectedSourceBookId())
  )

  createEffect(() => {
    if (props.splitView && otherBooks().length > 0 && !selectedSourceBookId()) {
      setSelectedSourceBookId(otherBooks()[0]._id)
    }
  })

  const addEntryFromSource = (sourceEntry: AppSchema.MemoryEntry) => {
    const newEntry = JSON.parse(JSON.stringify(sourceEntry))
    props.setter('entries', (prev) => [...prev, newEntry])
  }

  const addEntry = () => {
    const entry = {
      entry: '',
      keywords: [],
      name: '',
      priority: 0,
      weight: 0,
      enabled: true,
    }

    props.setter('entries', props.state.entries.concat(entry))
  }

  const onRemoveEntry = (pos: number) => {
    const next = props.state.entries.filter((_, i) => i !== pos)
    props.setter('entries', next)
  }

  createEffect(
    on(
      () => props.state,
      (incoming) => props.setter({ ...incoming, entries: incoming.entries.slice() })
    )
  )

  createEffect(
    on(
      () => props.entrySort,
      (entrySort) => {
        const next = sortEntries(props.state.entries, entrySort)
        props.setter('entries', next)
      }
    )
  )

  return (
    <>
      <div class="flex flex-col gap-2">
        <FormLabel
          fieldName="id"
          label="Id"
          helperText={props.state._id === '' ? 'New book' : props.state._id}
        />
        <TextInput
          label="Book Name"
          value={props.state.name}
          placeholder="Name for your memory book"
          required
          onChange={(e) => {
            props.setter({ name: e.currentTarget.value })
          }}
        />

        <TextInput
          label="Description"
          value={props.state.description}
          placeholder="(Optional) A description for your memory book"
          onChange={(e) => {
            props.setter({ description: e.currentTarget.value })
          }}
        />
        <Divider />
        <div class="sticky top-0 w-full py-2">
          <Card class="flex w-full items-center justify-between" bgOpacity={0.5}>
            <div class="text-lg font-bold">Entries</div>
            <Button onClick={addEntry}>
              <Plus /> Entry
            </Button>
          </Card>
        </div>
        <div class="flex items-start gap-4 py-2">
          <div class="w-1/2">
            <div class="flex items-center">
              <div class="max-w-[200px]">
                <TextInput
                  fieldName="search"
                  placeholder="Filter by entry name..."
                  onChange={(ev) => setSearch(ev.currentTarget.value)}
                />
              </div>
              <Select
                fieldName="entry-sort"
                items={entrySortItems}
                onChange={props.updateEntrySort}
                value={props.entrySort}
                class="mx-1 my-1"
              />
            </div>
          </div>
          <div class="w-1/2">
            <Show when={props.splitView}>
              <Select
                items={otherBooks().map((book) => ({ label: book.name, value: book._id }))}
                onChange={(opt) => setSelectedSourceBookId(opt.value)}
                value={selectedSourceBookId()}
              />
            </Show>
          </div>
        </div>
        <Show
          when={props.splitView}
          fallback={
            <Index each={props.state.entries}>
              {(entry, i) => (
                <EntryCard
                  entry={entry()}
                  index={i}
                  onRemove={() => onRemoveEntry(i)}
                  search={search()}
                  onChange={(e) => {
                    const next = modify(props.state.entries, e, i)
                    props.setter('entries', next)
                  }}
                />
              )}
            </Index>
          }
        >
          <div class="flex flex-row gap-4">
            <div class="w-1/2">
              <div class="flex flex-col gap-2">
                <Index each={props.state.entries}>
                  {(entry, i) => (
                    <EntryCard
                      entry={entry()}
                      index={i}
                      onRemove={() => onRemoveEntry(i)}
                      search={search()}
                      onChange={(e) => {
                        const next = modify(props.state.entries, e, i)
                        props.setter('entries', next)
                      }}
                    />
                  )}
                </Index>
              </div>
            </div>
            <div class="w-1/2">
              <Show when={sourceBook()}>
                <div class="flex flex-col gap-2">
                  <Index each={sourceBook()!.entries}>
                    {(entry, i) => (
                      <EntryCard
                        entry={entry()}
                        index={i}
                        search={search()}
                        readOnly={true}
                        onImport={() => addEntryFromSource(entry())}
                      />
                    )}
                  </Index>
                </div>
              </Show>
            </div>
          </div>
        </Show>
        <Button onClick={addEntry}>
          <Plus /> Entry
        </Button>
      </div>
    </>
  )
}

export default EditMemoryForm

const EntryCard: Component<{
  entry: AppSchema.MemoryEntry
  search: string
  index: number
  onRemove?: () => void
  onChange?: (e: Partial<AppSchema.MemoryEntry>) => void
  readOnly?: boolean
  onImport?: () => void
}> = (props) => {
  const cls = createMemo(() =>
    props.readOnly || props.entry.name.toLowerCase().includes(props.search.trim()) ? '' : 'hidden'
  )

  return (
    <Accordian
      open={missingFieldsInEntry(props.entry).length > 0}
      class={cls()}
      title={
        <Show
          when={!props.readOnly}
          fallback={
            <div class={`mb-1 flex w-full items-center gap-2`}>
              <TextInput
                placeholder="Name of entry"
                required
                class="w-full border-[1px]"
                value={props.entry.name}
                disabled={true}
              />
              <Toggle value={!!props.entry.enabled} class="flex items-center" disabled={true} />
              <Button size="sm" onClick={props.onImport}>
                <Plus class="h-4 w-4" /> Import
              </Button>
            </div>
          }
        >
          <div class={`mb-1 flex w-full items-center gap-2`}>
            <TextInput
              placeholder="Name of entry"
              required
              fieldName={`name.${props.index}`}
              class="w-full border-[1px]"
              value={props.entry.name}
              onChange={(e) => props.onChange?.({ name: e.currentTarget.value })}
            />
            <Toggle
              value={!!props.entry.enabled}
              class="flex items-center"
              onChange={(e) => props.onChange?.({ enabled: !!e })}
            />

            <Button schema="clear" class="icon-button" onClick={props.onRemove}>
              <X />
            </Button>
          </div>
        </Show>
      }
    >
      <Show
        when={!props.readOnly}
        fallback={
          <div class="flex flex-col gap-2">
            <TextInput
              prelabel="Keywords"
              required
              disabled={true}
              placeholder="Comma separated words. E.g.: circle, shape, round, cylinder, oval"
              class="border-[1px]"
              value={props.entry.keywords.join(',')}
            />
            <div class="flex flex-row gap-4">
              <TextInput
                prelabel="Priority"
                required
                disabled={true}
                type="number"
                class="border-[1px]"
                value={props.entry.priority ?? 0}
              />
              <TextInput
                prelabel="Weight"
                required
                disabled={true}
                type="number"
                class="border-[1px]"
                value={props.entry.weight ?? 0}
              />
            </div>
            <TextInput
              isMultiline
              value={props.entry.entry}
              placeholder="Memory entry. E.g. {{user}} likes fruit and vegetables"
              class="min-h-[64px] border-[1px]"
              required
              disabled={true}
            />
          </div>
        }
      >
        <div class="flex flex-col gap-2">
          <TextInput
            prelabel="Keywords"
            required
            placeholder="Comma separated words. E.g.: circle, shape, round, cylinder, oval"
            class="border-[1px]"
            value={props.entry.keywords.join(',')}
            onChange={(e) => props.onChange?.({ keywords: e.currentTarget.value.split(',') })}
          />
          <div class="flex flex-row gap-4">
            <TextInput
              prelabel="Priority"
              required
              type="number"
              class="border-[1px]"
              value={props.entry.priority ?? 0}
              onChange={(e) => props.onChange?.({ priority: +e.currentTarget.value })}
            />
            <TextInput
              prelabel="Weight"
              required
              type="number"
              class="border-[1px]"
              value={props.entry.weight ?? 0}
              onChange={(e) => props.onChange?.({ weight: +e.currentTarget.value })}
            />
          </div>
          <TextInput
            isMultiline
            value={props.entry.entry}
            placeholder="Memory entry. E.g. {{user}} likes fruit and vegetables"
            class="min-h-[64px] border-[1px]"
            required
            onChange={(e) => props.onChange?.({ entry: e.currentTarget.value })}
          />
        </div>
      </Show>
    </Accordian>
  )
}

function sortEntries(entries: AppSchema.MemoryEntry[], by: EntrySort): AppSchema.MemoryEntry[] {
  if (by === 'creationDate') {
    return entries
  }

  return entries.slice().sort((a, b) => {
    // ensure newly added entries are at the bottom
    return a.name === '' ? 1 : b.name === '' ? -1 : alphaCaseInsensitiveSort(a.name, b.name)
  })
}

function modify<T>(list: T[], update: Partial<T>, index: number) {
  const next: T[] = []
  for (let i = 0; i < list.length; i++) {
    if (i !== index) {
      next.push(list[i])
      continue
    }

    next.push({ ...list[i], ...update })
  }

  return next
}
