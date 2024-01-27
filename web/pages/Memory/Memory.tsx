import { A } from '@solidjs/router'
import { assertValid } from '/common/valid'
import { Download, Plus, Trash, Upload, X } from 'lucide-solid'
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
import { useTransContext } from '@mbarzda/solid-i18next'

export const EmbedsTab: Component = (props) => {
  const [t] = useTransContext()

  const state = memoryStore()
  const [deleting, setDeleting] = createSignal<string>()

  return (
    <>
      <PageHeader title={t('memory_dash_embeddings')} />
      <EmbedContent />

      <div class="my-2 flex flex-col gap-2">
        <For each={state.embeds}>
          {(each) => (
            <SolidCard
              border
              size="sm"
              class="flex items-center justify-between overflow-hidden"
              bg="bg-700"
            >
              <div class="ellipsis">{each.id}</div>
              <div>
                <Button schema="red" onClick={() => setDeleting(each.id)}>
                  <Trash size={14} />
                </Button>
              </div>
            </SolidCard>
          )}
        </For>
      </div>
      <ConfirmModal
        confirm={() => embedApi.removeDocument(deleting()!)}
        show={!!deleting()}
        close={() => setDeleting()}
        message={t('are_you_sure_you_wish_to_delete_this_embedding?', {
          name: deleting(),
        })}
      />
    </>
  )
}

export const BooksTab: Component = (props) => {
  const [t] = useTransContext()

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
        title={t('memory_dash_books')}
        subtitle={
          <>
            <a
              href="https://github.com/agnaistic/agnai/blob/dev/instructions/memory.md"
              target="_blank"
              class="link"
            >
              {t('memory_book_guide')}
            </a>
          </>
        }
      />

      <div class="flex w-full justify-end gap-4">
        <Button onClick={() => setImport(true)}>
          <Upload /> {t('import_book')}
        </Button>
        <A href="/memory/new">
          <Button>
            <Plus />
            {t('create_book')}
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
        message={t('are_you_sure_you_wish_to_delete_this_memory_book', { name: deleting()?.name })}
        close={() => setDeleting()}
        show={!!deleting()}
      />
    </>
  )
}

const NoBooks: Component = () => {
  const [t] = useTransContext()

  return <div class="flex justify-center">{t('you_have_no_memory_books_yet')}</div>
}

type ImportProps = {
  show: boolean
  close: () => void
}

const ImportMemoryModal: Component<ImportProps> = (props) => {
  const [t] = useTransContext()

  const [json, setJson] = createSignal<any>()

  const updateJson = async (files: FileInputResult[]) => {
    if (!files.length) return setJson()
    try {
      const content = await getFileAsString(files[0])
      const json = JSON.parse(content)
      validateBookJson(json)
      setJson(json)
      toastStore.success(t('character_file_accepted'))
    } catch (ex: any) {
      toastStore.warn(t('invalid_memory_book_json_with_message_x', { message: ex.message }))
    }
  }

  const onImport = () => {
    if (!json()) return
    memoryStore.create(json(), props.close)
  }

  const Footer = (
    <>
      <Button onClick={props.close}>
        <X /> {t('cancel')}
      </Button>
      <Button onClick={onImport}>
        <Upload /> {t('import')}
      </Button>
    </>
  )

  return (
    <Modal show={props.show} close={props.close} title={t('import_memory_book')} footer={Footer}>
      <FileInput
        fieldName="json"
        label={t('json_file')}
        accept="text/json,application/json"
        helperText={t('only_agnaistic_exported_memory_books_are_currently_supported')}
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
