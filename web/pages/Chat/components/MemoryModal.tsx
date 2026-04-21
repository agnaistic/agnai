import { Edit, PlusIcon, Save, X } from 'lucide-solid'
import {
  Component,
  createEffect,
  createMemo,
  createSignal,
  For,
  JSX,
  on,
  onMount,
  Show,
} from 'solid-js'
import { AppSchema } from '../../../../common/types/schema'
import Button from '../../../shared/Button'
import Divider from '../../../shared/Divider'
import Select, { Option } from '../../../shared/Select'
import { chatStore } from '../../../store'
import { memoryStore } from '../../../store'
import EditMemoryForm, { EntrySort } from '../../Memory/EditMemory'
import EmbedContent from '../../Memory/EmbedContent'
import { EditEmbedModal } from '/web/shared/EditEmbedModal'
import { Portal } from 'solid-js/web'
import { createStore } from 'solid-js/store'
import { emptyBook } from '/common/memory'
import { embedApi } from '/web/store/embeddings'
import Modal from '/web/shared/Modal'
import { Pill } from '/web/shared/Card'
import { sortAlpha } from '/common/util'

const ChatMemoryModal: Component<{
  chat: AppSchema.Chat | undefined
  close: () => void
  footer?: (children: JSX.Element) => void
}> = (props) => {
  const books = memoryStore((s) => ({
    books: s.books,
    items: s.books.list.map((book) => ({ label: book.name, value: book._id })),
    embeds: s.embeds,
  }))

  const [bookId, setBookId] = createSignal('')
  const [embedId, setEmbedId] = createSignal(props.chat?.userEmbedId)
  const [editingEmbed, setEditingEmbed] = createSignal<boolean>(false)
  const [state, setState] = createStore<AppSchema.MemoryBook>(emptyBook())
  const [openId, setOpenId] = createSignal<string>()
  const [entrySort, setEntrySort] = createSignal<EntrySort>('creationDate')

  const updateEntrySort = (item: Option<string>) => {
    if (item.value === 'creationDate' || item.value === 'alpha') {
      setEntrySort(item.value)
    }
  }

  const usedBooks = createMemo(() => {
    const memoryId = props.chat?.memoryId || ''
    const ids = memoryId.split(',').filter((id) => !!id.trim())
    const list = books.books.list.filter((item) => ids.includes(item._id)).sort(bookSorter)
    const validIds = list.map((item) => item._id)
    return { ids: validIds, list }
  })

  const availableBooks = createMemo(() => {
    const used = usedBooks()
    const set = new Set(used.ids)

    const available = books.books.list
      .filter((item) => !set.has(item._id))
      .map((item) => ({ label: item.name, value: item._id }))
      .sort(selectSorter)

    return [{ label: 'Select Book...', value: '' }].concat(available)
  })

  createEffect(
    on(
      () => props.chat?.userEmbedId,
      (id) => {
        if (!id) return
        setEmbedId(id)
      }
    )
  )

  const removeBook = async (removeId: string) => {
    if (!props.chat?._id) return
    const nextId = usedBooks()
      .ids.filter((id) => id !== removeId)
      .join(',')

    chatStore.editChat(props.chat._id, { memoryId: nextId })
  }

  const addBook = async (addId: string) => {
    const nextId = usedBooks().ids.concat(addId).join(',')

    useMemoryBook(nextId)
  }

  const useMemoryBook = (addBookId?: string) => {
    if (!props.chat?._id) return
    if (!addBookId) return

    const alreadyAssigned = usedBooks().ids.includes(addBookId)
    if (alreadyAssigned) return

    const nextId = usedBooks().ids.concat(addBookId).join(',')
    chatStore.editChat(props.chat._id, { memoryId: nextId })
  }

  const changeBook = async (id: string) => {
    const match: AppSchema.MemoryBook | undefined =
      id === 'new' || id === ''
        ? {
            _id: '',
            userId: '',
            entries: [],
            kind: 'memory',
            name: '',
            description: '',
          }
        : books.books.list.find((book) => book._id === id)

    if (match) setState(match)
    setOpenId(id)
  }

  const onSubmit = async () => {
    if (!state._id) {
      memoryStore.create(state, (next) => {
        setState('_id', next._id)
        setOpenId('')
      })
    } else {
      await memoryStore.update(state._id, state)
      setOpenId('')
    }
  }

  const useUserEmbed = () => {
    if (!props.chat?._id) return
    const id = embedId()
    chatStore.editChat(props.chat._id, { userEmbedId: id })

    if (id) {
      embedApi.loadDocument(id)
    }
  }

  const Footer = (
    <>
      <Button schema="secondary" onClick={props.close}>
        Close
      </Button>
      <Button onClick={onSubmit}>
        <Save />
        Save Memory Book
      </Button>
    </>
  )

  const embeds = createMemo(() => {
    return [{ label: 'None', value: '' }].concat(
      books.embeds.map((em) => ({ label: `${em.name} [${em.state}]`, value: em.id }))
    )
  })

  onMount(() => {
    props.footer?.(Footer)
  })

  return (
    <>
      <div class="flex flex-col gap-2">
        <div class="flex items-end gap-2">
          <Button
            disabled={!bookId()}
            onClick={() => {
              addBook(bookId())
              setBookId('')
            }}
          >
            <PlusIcon /> Use
          </Button>
          <Select
            fieldName="memoryId"
            label={
              <div class="flex items-center gap-2">
                Chat Memory Books{' '}
                <Button size="pill" onClick={() => changeBook('new')}>
                  + New Book
                </Button>
              </div>
            }
            items={availableBooks()}
            value={bookId()}
            onChange={(item) => setBookId(item.value)}
          />
        </div>

        <ul class="flex w-full flex-col gap-2">
          <For each={usedBooks().list}>
            {(book) => (
              <li class="flex w-full">
                <Pill class="w-full justify-between">
                  <div>{book.name}</div>
                  <Button size="sm" schema="clear" onClick={() => removeBook(book._id)}>
                    <X size={12} />
                  </Button>
                </Pill>
              </li>
            )}
          </For>
        </ul>

        <Divider />
        <Show when={books.embeds.length > 0}>
          <Select
            fieldName="embedId"
            label="Embedding"
            helperText="Which user-created embedding to use."
            items={embeds()}
            onChange={(item) => setEmbedId(item.value)}
            value={embedId()}
          />
          <div class="flex items-center gap-1">
            <Button
              class="w-fit"
              disabled={embedId() === props.chat?.userEmbedId}
              onClick={useUserEmbed}
            >
              <Save />
              Use Embedding
            </Button>

            <Button
              class="w-fit"
              disabled={editingEmbed() || !embedId()}
              onClick={() => setEditingEmbed(true)}
            >
              <Edit size={16} />
              Edit
            </Button>

            <Button
              schema="error"
              class="w-fit"
              disabled={!embedId()}
              onClick={() => embedApi.removeDocument(embedId()!)}
            >
              Remove
            </Button>
          </div>
          <Portal>
            <EditEmbedModal
              show={editingEmbed()}
              embedId={embedId()}
              close={() => setEditingEmbed(false)}
            />
          </Portal>
          <Divider />
        </Show>
        <EmbedContent />

        <Modal
          show={!!openId()}
          close={() => setOpenId('')}
          title="Memory Book Editor"
          maxWidth="full"
          footer={
            <>
              <Button schema="secondary" onClick={() => setOpenId('')}>
                Cancel
              </Button>
              <Button schema="success" onClick={() => onSubmit()}>
                Save
              </Button>
            </>
          }
        >
          <div class="text-sm">
            <EditMemoryForm
              hideSave
              state={state}
              entrySort={entrySort()}
              updateEntrySort={updateEntrySort}
              setter={setState}
            />
          </div>
        </Modal>
      </div>
    </>
  )
}

export default ChatMemoryModal

const bookSorter = sortAlpha<AppSchema.MemoryBook>({ prop: 'name', ignoreCase: true })
const selectSorter = sortAlpha<{ label: string }>({ prop: 'label', ignoreCase: true })
