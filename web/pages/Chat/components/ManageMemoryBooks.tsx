import { Component, createMemo, createSignal, For } from 'solid-js'
import { memoryStore } from '/web/store/memory'
import { sortAlpha } from '/common/util'
import { AppSchema } from '/common/types'
import { createStore } from 'solid-js/store'
import { emptyBook } from '/common/memory'
import Modal from '/web/shared/Modal'
import Button from '/web/shared/Button'
import EditMemoryForm, { EntrySort } from '../../Memory/EditMemory'
import Select, { Option } from '/web/shared/Select'
import { Pencil, PlusIcon, X } from 'lucide-solid'
import { Pill } from '/web/shared/Card'

export const ManageMemoryBooks: Component<{
  bookIds: string
  updateIds: (bookIds: string) => void
}> = (props) => {
  const books = memoryStore((s) => ({
    books: s.books,
    items: s.books.list.map((book) => ({ label: book.name, value: book._id })),
    embeds: s.embeds,
  }))

  const [bookId, setBookId] = createSignal('')
  const [state, setState] = createStore<AppSchema.MemoryBook>(emptyBook())
  const [openId, setOpenId] = createSignal<string>()
  const [entrySort, setEntrySort] = createSignal<EntrySort>('creationDate')

  const updateEntrySort = (item: Option<string>) => {
    if (item.value === 'creationDate' || item.value === 'alpha') {
      setEntrySort(item.value)
    }
  }

  const usedBooks = createMemo(() => {
    const memoryId = props.bookIds || ''
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

  const removeBook = async (removeId: string) => {
    const nextId = usedBooks()
      .ids.filter((id) => id !== removeId)
      .join(',')

    props.updateIds(nextId)
  }

  const addBook = async (addId: string) => {
    const nextId = usedBooks().ids.concat(addId).join(',')

    useMemoryBook(nextId)
  }

  const useMemoryBook = (addBookId?: string) => {
    if (!addBookId) return

    const alreadyAssigned = usedBooks().ids.includes(addBookId)
    if (alreadyAssigned) return

    const nextId = usedBooks().ids.concat(addBookId).join(',')
    props.updateIds(nextId)
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

  const onSaveBook = async () => {
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
                  <div class="flex gap-3">
                    <Button size="sm" schema="clear" onClick={() => changeBook(book._id)}>
                      <Pencil size={12} />
                    </Button>
                    <Button size="sm" schema="clear" onClick={() => removeBook(book._id)}>
                      <X size={12} />
                    </Button>
                  </div>
                </Pill>
              </li>
            )}
          </For>
        </ul>
      </div>

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
            <Button schema="success" onClick={() => onSaveBook()}>
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
    </>
  )
}

const bookSorter = sortAlpha<AppSchema.MemoryBook>({ prop: 'name', ignoreCase: true })
const selectSorter = sortAlpha<{ label: string }>({ prop: 'label', ignoreCase: true })
