import { A, useParams } from '@solidjs/router'
import { Plus, Save } from 'lucide-solid'
import { Component, createEffect, createSignal, For } from 'solid-js'
import { AppSchema } from '../../../srv/db/schema'
import Accordian from '../../shared/Accordian'
import Button from '../../shared/Button'
import Divider from '../../shared/Divider'
import { FormLabel } from '../../shared/FormLabel'
import Modal from '../../shared/Modal'
import PageHeader from '../../shared/PageHeader'
import TextInput from '../../shared/TextInput'
import { getFormEntries } from '../../shared/util'
import { memoryStore } from '../../store/memory'

const EditMemoryForm: Component = () => {
  let ref: any
  const { id } = useParams()

  const state = memoryStore()
  const [loaded, setLoaded] = createSignal(false)
  const [editing, setEditing] = createSignal<AppSchema.MemoryBook>({
    _id: '',
    name: '',
    entries: [
      {
        name: 'My first entry',
        entry: '',
        keywords: [],
        priority: 0,
        weight: 0,
      },
    ],
    kind: 'memory',
    userId: '',
  })

  createEffect(() => {
    if (id === 'new') return

    if (loaded()) return
    const match = state.books.list.find((m) => m._id === id)
    if (match) {
      setEditing(match)
    }

    if (!match) {
      memoryStore.getAll()
      setLoaded(true)
    }
  })

  const saveBook = () => {
    getBookEntries(ref)
  }

  const addEntry = () => {
    const book = editing()
    const next = book.entries.slice()
    next.push({ entry: '', keywords: [], name: '', priority: 0, weight: 0 })
    setEditing({ ...book, entries: next })
  }

  return (
    <>
      <div class="flex flex-col gap-2">
        <div class="flex w-full justify-between">
          <Button onClick={saveBook}>
            <Save /> Save
          </Button>
          <Button onClick={addEntry}>
            <Plus /> Entry
          </Button>
        </div>
        <TextInput
          fieldName="name"
          label="Book Name"
          value={editing().name}
          placeholder="Name for your memory book"
        />
        <Divider />
        <div class="text-lg font-bold">Entries</div>
        <form ref={ref} class="flex flex-col gap-2">
          <For each={editing().entries}>{(entry, i) => <EntryCard {...entry} index={i()} />}</For>
        </form>

        <div class="flex flex-col">
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

export const EditMemoryPage = () => (
  <>
    <PageHeader title="Edit Memory Book" />
    <EditMemoryForm />
  </>
)

export const EditMemoryModal = () => {
  const Footer = () => (
    <>
      <Button>
        <Plus />
        Entry
      </Button>
    </>
  )

  return (
    <Modal
      maxWidth="full"
      title="Memory Library"
      show={false}
      close={() => memoryStore.toggle(false)}
      footer={<Footer />}
    >
      <div class="min-h-[50vh]">
        <EditMemoryForm />
      </div>
    </Modal>
  )
}

const EntryCard: Component<AppSchema.MemoryEntry & { index: number }> = (props) => {
  return (
    <Accordian
      title={
        <div class="mb-1 flex items-center gap-2">
          <TextInput
            placeholder="Name of entry"
            fieldName={`name.${props.index}`}
            class="border-[1px]"
            value={props.name}
          />
        </div>
      }
    >
      <div class="flex flex-col gap-2">
        <TextInput
          fieldName={`keywords.${props.index}`}
          label="Keywords"
          placeholder="Comma separated words. E.g.: circle, shape, round, cylinder, oval"
          class="border-[1px]"
          value={props.keywords.join(', ')}
        />
        <div class="flex flex-row gap-4">
          <TextInput
            fieldName={`priority.${props.index}`}
            label="Priority"
            class="border-[1px]"
            value={props.priority ?? 0}
          />
          <TextInput
            fieldName={`weight.${props.index}`}
            label="Weight"
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
        />
      </div>
    </Accordian>
  )
}

const emptyEntry: AppSchema.MemoryEntry = {
  name: '',
  entry: '',
  keywords: [],
  priority: 0,
  weight: 0,
}

function getBookEntries(ref: HTMLFormElement) {
  const inputs = getFormEntries(ref)

  const map = new Map<string, AppSchema.MemoryEntry>()
  for (const [key, value] of inputs) {
    const [prop, i] = key.split('.')
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
    }

    map.set(i, prev)
  }

  const entries = Array.from(map.values())

  console.log(entries)
  return entries
}
