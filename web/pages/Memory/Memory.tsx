import { A } from '@solidjs/router'
import { assertValid } from '/common/valid'
import { Download, Plus, Trash, Upload, X, Edit, FileX, FileCheck } from 'lucide-solid'
import { Component, createSignal, For, onMount, Show } from 'solid-js'
import { AppSchema } from '../../../common/types/schema'
import Button from '../../shared/Button'
import FileInput, { FileInputResult, getFileAsString } from '../../shared/FileInput'
import Modal, { ConfirmModal } from '../../shared/Modal'
import PageHeader from '../../shared/PageHeader'
import { memoryStore, toastStore } from '../../store'
import { SolidCard } from '/web/shared/Card'
import EmbedContent from './EmbedContent'
import { embedApi } from '/web/store/embeddings'
import { EditEmbedModal } from '/web/shared/EditEmbedModal'
import { Page } from '/web/Layout'

type STEntry = {
  addMenu: boolean
  case_sensitive: boolean
  characterFilter?: any
  comment: string
  constant: boolean
  content: string
  depth: number
  disable: boolean
  displayIndex: 1
  enabled: boolean
  excludeRecursion: boolean
  extensions: {
    addMemo: boolean
    characterFilter?: any
    depth: number
    displayIndex: number
    excludeRecursion: number
    probability: number
    selectiveLogic: number
    useProbability: number
    weight: number
  }
  id: number
  uid: number
  name: string
  order: number
  keys: string[]

  insertion_order: number

  key: string[]
  keysecondary: string[]
  position: any
  priority: number

  /** 1-100 */
  probability: number

  secondary_keys: string[]
  selective: boolean
  selectiveLogic: number
  useProbability: boolean
}

type STVenusBook = {
  description: string
  entries: Record<string, STEntry>
  extensions: any
  is_creation: boolean
  name: string
  recursive_scanning: boolean
  scan_depth: number
  token_budget: number
}

type STExportedBook = {
  entries: Record<
    string,
    {
      uid: number
      key: string[]
      keysecondary: string[]
      comment: string
      content: string
      constant: boolean
      selective: boolean
      selectiveLogic: any
      addMenu: boolean
      order: number
      position: any
      disable: boolean
      excludeRecursion: boolean
      probability: number
      useProbability: boolean
      depth: number
      group: string
      scanDepth?: number
      caseSensitive?: boolean
      matchWholeWorlds?: boolean
      automationId?: string
      role?: string
      displayIndex: number
      preventRecursion: boolean
      groupOverride: boolean
      groupWeight: number
      vectorized: boolean
      delayUntilRecursion: boolean
      useGroupScoring?: boolean
      sticky: number
      cooldown: number
      delay: number
    }
  >
}

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

export const BooksTab: Component = (props) => {
  const state = memoryStore()
  const [showImport, setImport] = createSignal(false)
  const [deleting, setDeleting] = createSignal<AppSchema.MemoryBook>()

  const removeBook = (book: AppSchema.MemoryBook) => {
    memoryStore.remove(book._id)
  }

  onMount(() => {
    memoryStore.getAll()
  })

  return (
    <Page>
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
    </Page>
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
      const file = files[0]
      const content = await getFileAsString(file)
      const json = JSON.parse(content)
      const book = validateBookJson(file.file.name, json)
      setJson(book || json)
      toastStore.success('Memory book accepted')
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

function validateBookJson(filename: string, json: any): AppSchema.MemoryBook | void {
  if (isSTFormat(json)) {
    return convertFromSTVenus(json)
  }

  if (isSTExported(json)) {
    return convertFromSTExported(filename, json)
  }

  const book = json as AppSchema.MemoryBook
  json.name = json.name || 'Imported Book'
  json.kind = 'memory'

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

function isSTFormat(json: any): json is STVenusBook {
  return 'is_creation' in json && 'recursive_scanning' in json
}

function convertFromSTVenus(json: STVenusBook): AppSchema.MemoryBook {
  const base: AppSchema.MemoryBook = {
    _id: '',
    name: json.name || 'Imported Book',
    kind: 'memory',
    userId: '',
    description: json.description,
    extensions: { ...json, entries: {} },
    entries: [],
    recursiveScanning: json.recursive_scanning ?? false,
    scanDepth: json.scan_depth ?? 50,
    tokenBudget: json.token_budget ?? 500,
  }

  const entries = Object.values(json.entries)
    .sort((l, r) => l.id - r.id)
    .map<AppSchema.MemoryEntry>((entry, i) => ({
      priority: entry.priority,
      weight: entry.extensions.weight,
      comment: entry.comment,
      constant: entry.constant,
      id: i,
      name: entry.name,
      keywords: entry.keys,
      entry: entry.content,
      enabled: entry.enabled,

      // V2
      position: entry.position,
      excludeRecursion: entry.excludeRecursion,
      probability: entry.probability,
      useProbability: entry.useProbability,
      secondaryKeys: entry.secondary_keys,
      selective: entry.selective,
      selectiveLogic: entry.selectiveLogic,
    }))

  base.entries = entries
  return base
}

function isSTExported(json: any): json is STExportedBook {
  const keys = Object.keys(json || {}).filter((key) => key !== 'originalData')
  return keys.length === 1 && keys[0] === 'entries'
}

function convertFromSTExported(filename: string, json: STExportedBook): AppSchema.MemoryBook {
  const base: AppSchema.MemoryBook = {
    _id: '',
    name: filename.replace('.json', '') || 'Imported Book',
    kind: 'memory',
    userId: '',
    description: '',
    extensions: {},
    entries: [],
    recursiveScanning: false,
    scanDepth: 50,
    tokenBudget: 500,
  }

  const entries = Object.values(json.entries)
    .sort((l, r) => l.uid - r.uid)
    .map<AppSchema.MemoryEntry>((entry, i) => ({
      priority: 0,
      weight: 0,
      comment: '',
      constant: entry.constant,
      id: i,
      name: entry.comment,
      keywords: entry.key,
      entry: entry.content,
      enabled: !entry.disable,

      // V2
      position: entry.position,
      excludeRecursion: entry.preventRecursion,
      probability: entry.probability,
      useProbability: entry.useProbability,
      secondaryKeys: entry.keysecondary,
      selective: entry.selective,
      selectiveLogic: entry.selectiveLogic,
    }))

  base.entries = entries

  return base
}
