import { A } from '@solidjs/router'
import { assertValid } from '/common/valid'
import { Download, Plus, Trash, Upload, X } from 'lucide-solid'
import { Component, createEffect, createSignal, For, onMount, Show } from 'solid-js'
import { AppSchema } from '../../../common/types/schema'
import Button from '../../shared/Button'
import FileInput, { FileInputResult, getFileAsString } from '../../shared/FileInput'
import Modal from '../../shared/Modal'
import PageHeader from '../../shared/PageHeader'
import { memoryStore, toastStore } from '../../store'
import { Card } from '/web/shared/Card'
import EmbedContent from './EmbedContent'

export const EmbedsTab: Component = (props) => {
  const state = memoryStore()

  onMount(() => {
    memoryStore.listCollections()
  })

  return (
    <>
      <PageHeader title="Memory - Embeddings" />
      <EmbedContent />

      <div class="flex flex-col gap-2">
        <For each={state.embeds.filter((embed) => embed.metadata.type === 'user')}>
          {(each) => <Card>{each.name}</Card>}
        </For>
      </div>
    </>
  )
}

export const BooksTab: Component = (props) => {
  const state = memoryStore()
  const [showImport, setImport] = createSignal(false)

  const removeBook = (book: AppSchema.MemoryBook) => {
    memoryStore.remove(book._id)
  }

  createEffect(() => {
    memoryStore.getAll()
  })

  return (
    <>
      <PageHeader
        title="Memory - Books"
        subtitle={
          <>
            {' '}
            <a
              href="https://github.com/agnaistic/agnai/blob/dev/instructions/memory.md"
              target="_blank"
              class="link"
            >
              Memory Book Guide
            </a>
          </>
        }
      />

      <div class="flex w-full justify-end gap-4">
        <Button onClick={() => setImport(true)}>
          <Upload /> Import Book
        </Button>
        <A href="/memory/new">
          <Button>
            <Plus />
            Create Book
          </Button>
        </A>
      </div>

      <Show when={!state.books.list.length}>
        <NoBooks />
      </Show>

      <Show when={state.books.list.length}>
        <For each={state.books.list}>
          {(book) => (
            <div class="mt-2 flex w-full items-center gap-4">
              <A
                href={`/memory/${book._id}`}
                class="flex h-12 w-full cursor-pointer items-center gap-2 rounded-xl bg-[var(--bg-800)] px-4 hover:bg-[var(--bg-700)]"
              >
                <span class="font-bold">{book.name}</span>
                <span class="ml-2">{book.description}</span>
              </A>

              <a
                class="icon-button"
                href={`data:text/json:charset=utf-8,${encodeBook(book)}`}
                download={`book-${book._id.slice(0, 4)}-${book.name}.json`}
              >
                <Download />
              </a>
              <div class="icon-button" onClick={() => removeBook(book)}>
                <Trash />
              </div>
            </div>
          )}
        </For>
      </Show>

      <div class="flex flex-col items-center"></div>
      <ImportMemoryModal show={showImport()} close={() => setImport(false)} />
    </>
  )
}

const NoBooks = () => (
  <div class="flex justify-center">You have no memory books yet. Click Create to get started.</div>
)

type ImportProps = {
  show: boolean
  close: () => void
}

const ImportMemoryModal: Component<ImportProps> = (props) => {
  const [json, setJson] = createSignal<any>()

  const updateJson = async (files: FileInputResult[]) => {
    if (!files.length) return setJson()
    try {
      const content = await getFileAsString(files[0])
      const json = JSON.parse(content)
      validateBookJson(json)
      setJson(json)
      toastStore.success('Character file accepted')
    } catch (ex: any) {
      toastStore.warn(`Invalid memory book JSON. ${ex.message}`)
    }
  }

  const onImport = () => {
    if (!json()) return
    memoryStore.create(json(), props.close)
  }

  const Footer = (
    <>
      <Button onClick={props.close}>
        <X /> Cancel
      </Button>
      <Button onClick={onImport}>
        <Upload /> Import
      </Button>
    </>
  )

  return (
    <Modal show={props.show} close={props.close} title="Import Memory Book" footer={Footer}>
      <FileInput
        fieldName="json"
        label="JSON File"
        accept="text/json,application/json"
        helperText="Only Agnaistic exported memory books are currently supported."
        required
        onUpdate={updateJson}
      />
    </Modal>
  )
}

function encodeBook(book: AppSchema.MemoryBook) {
  const { _id, userId, ...body } = book
  return encodeURIComponent(JSON.stringify(body, null, 2))
}

function validateBookJson(json: any) {
  const book = json as AppSchema.MemoryBook

  const entries: AppSchema.MemoryEntry[] = []

  /**
   * - Attempt to convert any "should-be" numbers to numbers
   * - Remove entries with no prompt text
   * - Remove entries with no keywords
   * - Coalesce enable to true
   * - Coalese name to empty string
   */

  if (Array.isArray(book?.entries)) {
    for (const entry of book.entries) {
      entry.priority = toNumber(entry.priority)
      entry.weight = toNumber(entry.weight)
      if (entry.enabled === undefined) entry.enabled = true
      if (!entry.name) entry.name = ''
      if (!entry.entry) continue
      if (!Array.isArray(entry.keywords)) continue

      entries.push(entry)
    }
  }

  json.entries = entries

  assertValid(
    {
      kind: ['memory'],
      name: 'string',
      description: 'string?',
      entries: [
        {
          name: 'string',
          entry: 'string',
          keywords: ['string'],
          priority: 'number',
          weight: 'number',
          enabled: 'boolean',
        },
      ],
    },
    json
  )
}

function toNumber(value: any) {
  const num = +value

  if (isNaN(num)) return 0
  return num
}
