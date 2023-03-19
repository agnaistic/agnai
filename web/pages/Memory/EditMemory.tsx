import { A, useParams } from '@solidjs/router'
import { Plus } from 'lucide-solid'
import { Component, createEffect, createSignal, For } from 'solid-js'
import { AppSchema } from '../../../srv/db/schema'
import Accordian from '../../shared/Accordian'
import Button from '../../shared/Button'
import Divider from '../../shared/Divider'
import { FormLabel } from '../../shared/FormLabel'
import Modal from '../../shared/Modal'
import PageHeader from '../../shared/PageHeader'
import TextInput from '../../shared/TextInput'
import { memoryStore } from '../../store/memory'

const EditMemoryForm: Component = () => {
  const { id } = useParams()

  const state = memoryStore()
  const [loaded, setLoaded] = createSignal(false)
  const [editing, setEditing] = createSignal<AppSchema.MemoryBook>({
    _id: '',
    name: 'New Book',
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

  const addEntry = () => {
    const book = editing()
    const next = book.entries.slice()
    next.push({ entry: '', keywords: [], name: '', priority: 0, weight: 0 })
    setEditing({ ...book, entries: next })
  }

  return (
    <>
      <div class="flex flex-col gap-2">
        <div class="flex w-full justify-end">
          <Button onClick={addEntry}>
            <Plus /> Entry
          </Button>
        </div>
        <TextInput fieldName="name" label="Name" value={editing().name} />
        <Divider />
        <div class="text-lg font-bold">Entries</div>
        <For each={editing().entries}>
          {(entry, i) => (
            <Accordian
              title={
                <div class="mb-1 flex items-center gap-2">
                  <TextInput
                    placeholder="Name of entry"
                    fieldName={`entryName.${i()}`}
                    class="border-[1px]"
                    value={entry.name}
                  />
                </div>
              }
            >
              <div class="flex flex-col gap-2">
                <TextInput
                  fieldName={`entryKeywords.${i()}`}
                  label="Keywords"
                  placeholder="Comma separated words. E.g.: circle, shape, round, cylinder, oval"
                  class="border-[1px]"
                  value={entry.keywords.join(', ')}
                />
                <div class="flex flex-row">
                  <TextInput
                    fieldName={`entryPriorty.${i()}`}
                    label="Priority"
                    class="border-[1px]"
                    value={entry.priority ?? 0}
                  />
                  <TextInput
                    fieldName={`entryWeight.${i()}`}
                    label="Weight"
                    class="border-[1px]"
                    value={entry.weight ?? 0}
                  />
                </div>
                <TextInput
                  fieldName={`entryText.${i()}`}
                  isMultiline
                  value={entry.entry}
                  placeholder="Memory entry. E.g. {{user}} likes fruit and vegetables"
                  class="border-[1px]"
                />
              </div>
            </Accordian>
          )}
        </For>

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
