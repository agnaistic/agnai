import { A, useNavigate, useParams } from '@solidjs/router'
import { Plus, Save, X } from 'lucide-solid'
import { Component, createEffect, createSignal, For, Show } from 'solid-js'
import { AppSchema } from '../../../srv/db/schema'
import Accordian from '../../shared/Accordian'
import Button from '../../shared/Button'
import Divider from '../../shared/Divider'
import { FormLabel } from '../../shared/FormLabel'
import PageHeader from '../../shared/PageHeader'
import TextInput from '../../shared/TextInput'
import { Toggle } from '../../shared/Toggle'
import { getFormEntries, getStrictForm } from '../../shared/util'
import { memoryStore } from '../../store/memory'

const newBook: AppSchema.MemoryBook = {
  _id: '',
  name: '',
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

const EditMemoryForm: Component<{ book: AppSchema.MemoryBook; hideSave?: boolean }> = (props) => {
  const { id } = useParams()
  const [editing, setEditing] = createSignal(props.book)

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

  return (
    <>
      <div class="flex flex-col gap-2">
        <div class="flex w-full justify-between">
          <div>
            <Show when={!props.hideSave}>
              <Button type="submit">
                <Save /> Save
              </Button>
            </Show>
          </div>
          <Button onClick={addEntry}>
            <Plus /> Entry
          </Button>
        </div>
        <FormLabel
          fieldName="id"
          label="Id"
          helperText={id === 'new' ? 'New book' : editing()._id}
        />
        <TextInput
          fieldName="name"
          label="Book Name"
          value={editing().name}
          placeholder="Name for your memory book"
          required
        />
        <Divider />
        <div class="text-lg font-bold">Entries</div>
        <For each={editing().entries}>
          {(entry, i) => <EntryCard {...entry} index={i()} onRemove={() => onRemoveEntry(i())} />}
        </For>

        <div class="mt-8 flex flex-col">
          <div class="flex flex-col gap-2">
            <div class="text-lg font-bold">Defintitons</div>
            <FormLabel
              fieldName="priorty"
              label="Priorty"
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
      </div>
    </>
  )
}

export default EditMemoryForm

export const EditMemoryPage = () => {
  let ref: any
  const nav = useNavigate()
  const { id } = useParams()
  const state = memoryStore()
  const [loaded, setLoaded] = createSignal(false)
  const [editing, setEditing] = createSignal<AppSchema.MemoryBook>()

  createEffect(() => {
    if (id === 'new') {
      setEditing({ ...newBook, entries: [{ ...emptyEntry, name: 'New Entry' }] })
      return
    }

    const match = state.books.list.find((m) => m._id === id)
    if (match) {
      setEditing(match)
    }

    if (!match && !loaded()) {
      memoryStore.getAll()
      setLoaded(true)
    }
  })

  const saveBook = (ev: Event) => {
    ev.preventDefault()
    const body = getBookUpdate(ref)
    if (!id) return

    if (id === 'new') {
      memoryStore.create(body, (book) => nav(`/memory/${book._id}`))
    } else {
      memoryStore.update(id, body)
    }
  }

  return (
    <>
      <PageHeader title="Edit Memory Book" />
      <Show when={!!editing()}>
        <form ref={ref} onSubmit={saveBook}>
          <EditMemoryForm book={editing()!} />
          <div class="flex justify-end">
            <Button type="submit">
              <Save />
              {id === 'new' ? 'Create Book' : 'Update Book'}
            </Button>
          </div>
        </form>
      </Show>
    </>
  )
}

const EntryCard: Component<AppSchema.MemoryEntry & { index: number; onRemove: () => void }> = (
  props
) => {
  return (
    <Accordian
      open={false}
      title={
        <div class="mb-1 flex w-full items-center gap-2">
          <TextInput
            placeholder="Name of entry"
            required
            fieldName={`name.${props.index}`}
            class="w-full border-[1px]"
            value={props.name}
          />
          <div class="flex items-center">
            <Toggle fieldName={`enabled.${props.index}`} value={!!props.enabled} />
          </div>
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
  const { name } = getStrictForm(ref, { name: 'string' })

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

  const book = { name, entries }
  return book
}
