import { Plus, X } from 'lucide-solid'
import { Component, createEffect, createMemo, createSignal, Index, on } from 'solid-js'
import { AppSchema } from '../../../common/types/schema'
import Accordian from '../../shared/Accordian'
import Button from '../../shared/Button'
import Divider from '../../shared/Divider'
import { FormLabel } from '../../shared/FormLabel'
import Select, { Option } from '../../shared/Select'
import TextInput from '../../shared/TextInput'
import { Toggle } from '../../shared/Toggle'
import { alphaCaseInsensitiveSort, getFormEntries, getStrictForm } from '../../shared/util'
import { emptyEntry } from '/common/memory'
import { Card } from '/web/shared/Card'
import { createStore } from 'solid-js/store'

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
  book: AppSchema.MemoryBook
  hideSave?: boolean
  updateEntrySort: (opn: Option<string>) => void
  entrySort: EntrySort
  onChange?: (book: Partial<AppSchema.MemoryBook>) => void
}> = (props) => {
  const [state, setState] = createStore({ ...props.book })
  const [entries, setEntries] = createStore(props.book.entries)

  const [search, setSearch] = createSignal('')

  const change = (book: Partial<AppSchema.MemoryBook>) => {
    setState(book)
    props.onChange?.(book)
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

    setEntries(entries.concat(entry))
    change({ ...props.book, entries })
  }

  const onRemoveEntry = (pos: number) => {
    const next = entries.filter((_, i) => i !== pos)
    setEntries(next)
    change({ ...props.book, entries: next })
  }

  createEffect(
    on(
      () => props.entrySort,
      (entrySort) => {
        const next = sortEntries(entries, entrySort)
        setEntries(next)
      }
    )
  )

  return (
    <>
      <div class="flex flex-col gap-2">
        <FormLabel
          fieldName="id"
          label="Id"
          helperText={props.book._id === '' ? 'New book' : props.book._id}
        />
        <TextInput
          label="Book Name"
          value={state.name}
          placeholder="Name for your memory book"
          required
          onChange={(e) => {
            change({ name: e.currentTarget.value })
          }}
        />

        <TextInput
          label="Description"
          value={state.name}
          placeholder="(Optional) A description for your memory book"
          onChange={(e) => {
            change({ description: e.currentTarget.value })
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
        <div class="flex items-center">
          <div class="max-w-[200px]">
            <TextInput
              fieldName="search"
              placeholder="Filter by entry name..."
              onKeyUp={(ev) => setSearch(ev.currentTarget.value)}
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
        <Index each={entries}>
          {(entry, i) => (
            <EntryCard
              {...entry}
              entry={entry()}
              index={i}
              onRemove={() => onRemoveEntry(i)}
              search={search()}
              onChange={(e) => {
                const next = modify(entries, e, i)
                setEntries(next)
                change({ entries: next })
              }}
            />
          )}
        </Index>
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
  onRemove: () => void
  index: number
  onChange: (e: AppSchema.MemoryEntry) => void
}> = (props) => {
  const cls = createMemo(() =>
    props.entry.name.toLowerCase().includes(props.search.trim()) ? '' : 'hidden'
  )

  return (
    <Accordian
      open={missingFieldsInEntry(props.entry).length > 0}
      class={cls()}
      title={
        <div class={`mb-1 flex w-full items-center gap-2`}>
          <TextInput
            placeholder="Name of entry"
            required
            fieldName={`name.${props.index}`}
            class="w-full border-[1px]"
            value={props.entry.name}
            onChange={(e) => {
              props.onChange({ ...props.entry, name: e.currentTarget.value })
            }}
          />
          <Toggle
            value={!!props.entry.enabled}
            class="flex items-center"
            onChange={(e) => {
              props.onChange({ ...props.entry, enabled: !!e })
            }}
          />

          <Button schema="clear" class="icon-button" onClick={props.onRemove}>
            <X />
          </Button>
        </div>
      }
    >
      <div class="flex flex-col gap-2">
        <TextInput
          label="Keywords"
          required
          placeholder="Comma separated words. E.g.: circle, shape, round, cylinder, oval"
          class="border-[1px]"
          value={props.entry.keywords.map((k) => k.trim()).join(', ')}
          onChange={(e) => {
            props.onChange({
              ...props.entry,
              keywords: e.currentTarget.value.split(',').map((k) => k.trim()),
            })
          }}
        />
        <div class="flex flex-row gap-4">
          <TextInput
            label="Priority"
            required
            type="number"
            class="border-[1px]"
            value={props.entry.priority ?? 0}
            onChange={(e) => {
              props.onChange({ ...props.entry, priority: +e.currentTarget.value })
            }}
          />
          <TextInput
            label="Weight"
            required
            type="number"
            class="border-[1px]"
            value={props.entry.weight ?? 0}
            onChange={(e) => {
              props.onChange({ ...props.entry, weight: +e.currentTarget.value })
            }}
          />
        </div>
        <TextInput
          isMultiline
          value={props.entry.entry}
          placeholder="Memory entry. E.g. {{user}} likes fruit and vegetables"
          class="min-h-[64px] border-[1px]"
          required
          onKeyUp={(e) => {
            props.onChange({ ...props.entry, entry: e.currentTarget.value })
          }}
        />
      </div>
    </Accordian>
  )
}

export function getBookUpdate(ref: Event | HTMLFormElement) {
  const inputs = getFormEntries(ref)
  const { bookName = '', bookDesc } = getStrictForm(ref, {
    bookName: 'string?',
    bookDesc: 'string?',
  })

  const map = new Map<string, AppSchema.MemoryEntry>()

  for (const [key, value] of inputs) {
    const [prop, i] = key.split('.')
    if (i === undefined) continue

    const prev = map.get(i) || { ...emptyEntry() }

    switch (prop) {
      case 'name':
      case 'entry':
        prev[prop] = value
        break

      case 'weight':
      case 'priority':
        prev[prop] = +value
        break

      case 'keywords':
        prev.keywords = value
          .split(',')
          .filter((v) => !!v)
          .map((v) => v.trim())
        break

      case 'enabled':
        prev.enabled = !!value
        break
    }

    map.set(i, prev)
  }

  const entries = Array.from(map.values())

  const book = { name: bookName, description: bookDesc, entries }
  return book
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
