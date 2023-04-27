import { A, useNavigate, useParams } from '@solidjs/router'
import { Plus, Save, X } from 'lucide-solid'
import { Component, createEffect, createMemo, createSignal, For, Show } from 'solid-js'
import { AppSchema } from '../../../srv/db/schema'
import Accordian from '../../shared/Accordian'
import Button from '../../shared/Button'
import Divider from '../../shared/Divider'
import { FormLabel } from '../../shared/FormLabel'
import PageHeader from '../../shared/PageHeader'
import Select, { Option } from '../../shared/Select'
import TextInput from '../../shared/TextInput'
import { Toggle } from '../../shared/Toggle'
import {
  alphaCaseInsensitiveSort,
  getFormEntries,
  getStrictForm,
  setComponentPageTitle,
} from '../../shared/util'
import { memoryStore } from '../../store'

const newBook: AppSchema.MemoryBook = {
  _id: '',
  name: '',
  description: '',
  entries: [],
  kind: 'memory',
  userId: '',
}

const emptyEntry: AppSchema.MemoryEntry = {
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

export const EditMemoryPage = () => {
  const { updateTitle } = setComponentPageTitle('Memory book')
  let ref: any
  const nav = useNavigate()
  const params = useParams()
  const state = memoryStore()
  const [editing, setEditing] = createSignal<AppSchema.MemoryBook>()
  const [entrySort, setEntrySort] = createSignal<EntrySort>('creationDate')
  const updateEntrySort = (item: Option<string>) => {
    if (item.value === 'creationDate' || item.value === 'alpha') {
      setEntrySort(item.value)
    }
  }

  createEffect(() => {
    if (params.id === 'new') {
      updateTitle('Create memory book')
      setEditing({ ...newBook, entries: [{ ...emptyEntry, name: 'New Entry' }] })
      return
    }

    const match = state.books.list.find((m) => m._id === params.id)
    if (match) {
      updateTitle(`Edit ${match.name}`)
      setEditing(match)
    }
  })

  const saveBook = (ev: Event) => {
    ev.preventDefault()
    // Why do we set the sort to creationDate before saving, then restore the
    // previous sort? Two reasons:
    // - Creation date is not actually saved in the DB
    // - When saving the memory book, the data is taken from the DOM
    // (This should ideally be improved in a future patch)
    // Therefore every time we save the memory book we have to ensure the DOM
    // has the entries in creation order, for now.
    const oldEntrySort = entrySort()
    setEntrySort('creationDate')
    const body = getBookUpdate(ref)
    if (!params.id) return

    if (params.id === 'new') {
      memoryStore.create(body, (book) => {
        setEditing(book)
        nav(`/memory/${book._id}`)
      })
    } else {
      memoryStore.update(params.id, body)
    }
    setEntrySort(oldEntrySort)
  }

  return (
    <>
      <PageHeader title="Edit Memory Book" />
      <Show when={!!editing()}>
        <form ref={ref} onSubmit={saveBook}>
          <EditMemoryForm
            book={editing()!}
            entrySort={entrySort()}
            updateEntrySort={updateEntrySort}
          />
          <div class="mt-4 flex justify-end">
            <Button type="submit">
              <Save />
              {!editing()?._id ? 'Create Book' : 'Update Book'}
            </Button>
          </div>

          <div class="mt-8 flex flex-col">
            <div class="flex flex-col gap-2">
              <div class="text-lg font-bold">Definitions</div>
              <FormLabel
                fieldName="priorty"
                label="Priority"
                helperText="When deciding which entries to INCLUDE in the prompt, the higher the priority entries win."
              />

              <FormLabel
                fieldName="weight"
                label="Weight"
                helperText="When deciding how to ORDER entries, the higher the weight the closer to the bottom."
              />

              <FormLabel
                fieldName="keywords"
                label="Keywords"
                helperText={
                  <>
                    These are the terms that trigger the entry to be potentially included in the
                    prompt. You can use <code>{'{{char}}'}</code> and <code>{'{{user}}'}</code>{' '}
                    placeholders here.
                  </>
                }
              />

              <FormLabel
                fieldName="entry"
                label="Entry"
                helperText={
                  <>
                    This is the text that will be included in the prompt. You can use{' '}
                    <code>{'{{char}}'}</code> and <code>{'{{user}}'}</code> placeholders here.
                  </>
                }
              />
            </div>
          </div>
        </form>
      </Show>
    </>
  )
}

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
