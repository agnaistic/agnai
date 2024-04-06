import { A } from '@solidjs/router'
import { assertValid } from '/common/valid'
import { Download, Plus, Trash, Upload, X, Edit, FileX, FileCheck } from 'lucide-solid'
import { Component, createEffect, createSignal, For, Show } from 'solid-js'
import { AppSchema } from '../../../common/types/schema'
import Button from '../../shared/Button'
import FileInput, { FileInputResult, getFileAsString } from '../../shared/FileInput'
import Modal, { ConfirmModal } from '../../shared/Modal'
import PageHeader from '../../shared/PageHeader'
import { memoryStore, toastStore } from '../../store'
import { SolidCard } from '/web/shared/Card'
import EmbedContent from './EmbedContent'
import { embedApi } from '/web/store/embeddings'
import TextInput from '/web/shared/TextInput'
import { RequestDocEmbed } from '/web/store/embeddings/types'
import { getStrictForm } from '/web/shared/util'

export const EmbedsTab: Component = (props) => {
  const state = memoryStore()
  const [editing, setEditing] = createSignal<string>()
  const [deleting, setDeleting] = createSignal<string>()

  return (
    <>
      <PageHeader title="Memory - Embeddings" />
      <EmbedContent />

      <div class="flex flex-col gap-2">
        <For each={state.embeds}>
          {(each) => (
            <div class="mt-2 flex w-full items-center gap-4">
              <SolidCard size="md" class="flex w-full items-center gap-1" bg="bg-800">
                <div
                  class="flex cursor-pointer"
                  title={each.state === 'loaded' ? 'Loaded' : 'Not loaded'}
                >
                  {each.state === 'loaded' ? <FileCheck /> : <FileX class="text-gray-500" />}
                </div>
                <div class="ellipsis font-bold">{each.id}</div>
              </SolidCard>

              <div class="icon-button" onClick={() => setEditing(each.id)}>
                <Edit />
              </div>

              <div class="icon-button" onClick={() => setDeleting(each.id)}>
                <Trash />
              </div>
            </div>
          )}
        </For>
      </div>
      <EditEmbedModal show={!!editing()} embedId={editing()} close={() => setEditing()} />
      <ConfirmModal
        confirm={() => embedApi.removeDocument(deleting()!)}
        show={!!deleting()}
        close={() => setDeleting()}
        message={`Are you sure you wish to delete this embedding?\n\n${deleting()}`}
      />
    </>
  )
}

const EditEmbedModal: Component<{ show: boolean; embedId?: string; close: () => void }> = (
  props
) => {
  let form: HTMLFormElement | undefined

  const [content, setContent] = createSignal<string>()
  const [loading, setLoading] = createSignal(false)

  createEffect(async () => {
    if (!props.show || !props.embedId) return

    setLoading(true)
    let doc: RequestDocEmbed | undefined
    try {
      doc = await embedApi.cache.getDoc(props.embedId)
    } finally {
      setLoading(false)
    }

    if (doc) {
      // get the content of the document by combining all the lines
      const lines = doc.documents.map((d) => d.msg).join('\n')
      setContent(lines)
    } else {
      toastStore.error(`Failed to load embedding ${props.embedId}`)
      props.close()
    }
  })

  const cancel = () => {
    setContent('')
    props.close()
  }

  const updateEmbed = async () => {
    if (!form || !props.embedId) return

    setLoading(true)
    try {
      const { embedText } = getStrictForm(form, { embedText: 'string' })
      if (!embedText) {
        toastStore.warn(`Embedding content cannot be empty`)
        return
      }

      await embedApi.embedPlainText(props.embedId, embedText)
      toastStore.success('Successfully updated embedding')
      cancel()
    } finally {
      setLoading(false)
    }
  }

  const Footer = (
    <>
      <Button onClick={cancel}>
        <X /> Cancel
      </Button>
      <Button onClick={updateEmbed}>
        <Edit /> Update
      </Button>
    </>
  )

  return (
    <Modal show={props.show} close={props.close} title="Edit Embedding" footer={Footer}>
      <form ref={form}>
        <TextInput
          fieldName="embedText"
          label="Content"
          helperText="The content to be embedded. Use line breaks to seperate lines."
          isMultiline
          value={content()}
          required
          disabled={loading()}
        />
      </form>
    </Modal>
  )
}

export const BooksTab: Component = (props) => {
  const state = memoryStore()
  const [showImport, setImport] = createSignal(false)
  const [deleting, setDeleting] = createSignal<AppSchema.MemoryBook>()

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
                class="ellipsis flex h-12 w-full cursor-pointer items-center gap-2 rounded-xl bg-[var(--bg-800)] px-4 hover:bg-[var(--bg-700)]"
              >
                <span class="ellipsis font-bold">{book.name}</span>
                <span class="ml-2">{book.description}</span>
              </A>

              <a
                class="icon-button"
                href={`data:text/json:charset=utf-8,${encodeBook(book)}`}
                download={`book-${book._id.slice(0, 4)}-${book.name}.json`}
              >
                <Download />
              </a>
              <div class="icon-button" onClick={() => setDeleting(book)}>
                <Trash />
              </div>
            </div>
          )}
        </For>
      </Show>

      <div class="flex flex-col items-center"></div>
      <ImportMemoryModal show={showImport()} close={() => setImport(false)} />
      <ConfirmModal
        confirm={() => removeBook(deleting()!)}
        message={`Are you sure you wish to delete this memory book?\n\n${deleting()?.name}`}
        close={() => setDeleting()}
        show={!!deleting()}
      />
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
