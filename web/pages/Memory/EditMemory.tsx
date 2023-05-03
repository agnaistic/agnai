import { Plus, X } from 'lucide-solid'
import { Component, createMemo, createSignal, For } from 'solid-js'
import { AppSchema } from '../../../srv/db/schema'
import Accordian from '../../shared/Accordian'
import Button from '../../shared/Button'
import Divider from '../../shared/Divider'
import { FormLabel } from '../../shared/FormLabel'
import Select, { Option } from '../../shared/Select'
import TextInput from '../../shared/TextInput'
import { Toggle } from '../../shared/Toggle'
import { alphaCaseInsensitiveSort, getFormEntries, getStrictForm } from '../../shared/util'

export const emptyEntry: AppSchema.MemoryEntry = {
  name: '',
  entry: '',
  keywords: [],
  priority: 0,
  weight: 0,
  enabled: false,
}

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

const sortEntries = (entries: AppSchema.MemoryEntry[], by: EntrySort): AppSchema.MemoryEntry[] => {
  if (by === 'creationDate') {
    return entries
  } else {
    return [...entries].sort((a, b) => {
      // ensure newly added entries are at the bottom
      if (a.name === '') {
        return 1
      } else if (b.name === '') {
        return -1
      } else {
        return alphaCaseInsensitiveSort(a.name, b.name)
      }
    })
  }
}

const EditMemoryForm: Component<{
  book: AppSchema.MemoryBook
  hideSave?: boolean
  updateEntrySort: (opn: Option<string>) => void
  entrySort: EntrySort
}> = (props) => {
  const [editing, setEditing] = createSignal(props.book)
  const [search, setSearch] = createSignal('')

  const addEntry = () => {
    const book = editing()
    const next = book.entries.slice()
    next.push({ entry: '', keywords: [], name: '', priority: 0, weight: 0, enabled: true })
    setEditing({ ...book, entries: next })
  }

  const onRemoveEntry = (pos: number) => {
    const book = editing()
    const next = book.entries.filter((_, i) => i !== pos)

    setEditing({ ...book, entries: next })
  }

  const entries = () => sortEntries(editing().entries, props.entrySort)

  return (
    <>
      <div class="flex flex-col gap-2">
        <FormLabel
          fieldName="id"
          label="Id"
          helperText={props.book._id === '' ? 'New book' : props.book._id}
        />
        <TextInput
          fieldName="name"
          label="Book Name"
          value={editing().name}
          placeholder="Name for your memory book"
          required
        />

        <TextInput
          fieldName="description"
          label="Description"
          value={editing().description}
          placeholder="(Optional) A description for your memory book"
        />
        <Divider />
        <div class="sticky top-0 z-10 flex items-center justify-between bg-[var(--bg-900)] py-2">
          <div class="text-lg font-bold">Entries</div>
          <Button onClick={addEntry}>
            <Plus /> Entry
          </Button>
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
        <For each={entries()}>
          {(entry, i) => (
            <EntryCard
              {...entry}
              index={i()}
              onRemove={() => onRemoveEntry(i())}
              search={search()}
            />
          )}
        </For>
        <Button onClick={addEntry}>
          <Plus /> Entry
        </Button>
      </div>
    </>
  )
}

export default EditMemoryForm

const EntryCard: Component<
  AppSchema.MemoryEntry & { index: number; onRemove: () => void; search: string }
> = (props) => {
  const cls = createMemo(() =>
    props.name.toLowerCase().includes(props.search.trim()) ? '' : 'hidden'
  )
  return (
    <Accordian
      open={missingFieldsInEntry(props).length > 0}
      class={cls()}
      title={
        <div class={`mb-1 flex w-full items-center gap-2`}>
          <TextInput
            placeholder="Name of entry"
            required
            fieldName={`name.${props.index}`}
            class="w-full border-[1px]"
            value={props.name}
          />
          <Toggle
            fieldName={`enabled.${props.index}`}
            value={!!props.enabled}
            class="flex items-center"
          />

          <Button schema="clear" class="icon-button" onClick={props.onRemove}>
            <X />
          </Button>
        </div>
      }
    >
      <div class="flex flex-col gap-2">
        <TextInput
          fieldName={`keywords.${props.index}`}
          label="Keywords"
          required
          placeholder="Comma separated words. E.g.: circle, shape, round, cylinder, oval"
          class="border-[1px]"
          value={props.keywords.join(', ')}
        />
        <div class="flex flex-row gap-4">
          <TextInput
            fieldName={`priority.${props.index}`}
            label="Priority"
            required
            type="number"
            class="border-[1px]"
            value={props.priority ?? 0}
          />
          <TextInput
            fieldName={`weight.${props.index}`}
            label="Weight"
            required
            type="number"
            class="border-[1px]"
            value={props.weight ?? 0}
          />
        </div>
        <TextInput
          fieldName={`entry.${props.index}`}
          isMultiline
          value={props.entry}
          placeholder="Memory entry. E.g. {{user}} likes fruit and vegetables"
          class="border-[1px]"
          required
        />
      </div>
    </Accordian>
  )
}

export function getBookUpdate(ref: Event | HTMLFormElement) {
  const inputs = getFormEntries(ref)
  const { name, description } = getStrictForm(ref, { name: 'string', description: 'string?' })

  const map = new Map<string, AppSchema.MemoryEntry>()
  for (const [key, value] of inputs) {
    const [prop, i] = key.split('.')
    if (i === undefined) continue

    const prev = map.get(i) || { ...emptyEntry }

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

  const book = { name, description, entries }
  return book
}
