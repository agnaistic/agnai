import { Save } from 'lucide-solid'
import { Component, createSignal, createMemo, Show } from 'solid-js'
import EditMemoryForm, { EntrySort, getBookUpdate } from '../../Memory/EditMemory'
import { BUNDLED_CHARACTER_BOOK_ID, emptyBookWithEmptyEntry } from '/common/memory'
import { AppSchema } from '/common/types'
import Button from '/web/shared/Button'
import { useRootModal } from '/web/shared/hooks'
import Modal from '/web/shared/Modal'
import Select, { Option } from '/web/shared/Select'
import { memoryStore } from '/web/store'

export const MemoryBookPicker: Component<{
  bundledBook: AppSchema.MemoryBook | undefined
  setBundledBook: (newVal: AppSchema.MemoryBook | undefined) => void
}> = (props) => {
  const memory = memoryStore()
  const [isModalShown, setIsModalShown] = createSignal(false)
  const [entrySort, setEntrySort] = createSignal<EntrySort>('creationDate')
  const updateEntrySort = (item: Option<string>) => {
    if (item.value === 'creationDate' || item.value === 'alpha') {
      setEntrySort(item.value)
    }
  }

  const NONE_VALUE = '__none_character_book__'
  const internalMemoryBookOptions = createMemo(() => [
    { label: 'Import Memory Book', value: NONE_VALUE },
    ...memory.books.list.map((book) => ({ label: book.name, value: book._id })),
  ])
  const pickInternalMemoryBook = (option: Option) => {
    const newBook = memory.books.list.find((book) => book._id === option.value)
    props.setBundledBook(newBook ? { ...newBook, _id: BUNDLED_CHARACTER_BOOK_ID } : undefined)
  }
  const initBlankCharacterBook = () => {
    props.setBundledBook(emptyBookWithEmptyEntry())
  }
  const deleteBook = () => {
    props.setBundledBook(undefined)
  }
  const ModalFooter = () => (
    <>
      <Button schema="secondary" onClick={() => setIsModalShown(false)}>
        Close
      </Button>
      <Button type="submit">
        <Save />
        Save Character Book
      </Button>
    </>
  )
  const onSubmitCharacterBookChanges = (ev: Event) => {
    ev.preventDefault()
    const update = getBookUpdate(ev)
    if (props.bundledBook) {
      props.setBundledBook({ ...props.bundledBook, ...update })
    }
    setIsModalShown(false)
  }

  const BookModal = (
    <Modal
      title="Character Memory"
      show={isModalShown()}
      close={() => setIsModalShown(false)}
      footer={<ModalFooter />}
      onSubmit={onSubmitCharacterBookChanges}
      maxWidth="half"
      fixedHeight
    >
      <div class="text-sm">
        <EditMemoryForm
          hideSave
          book={props.bundledBook!}
          entrySort={entrySort()}
          updateEntrySort={updateEntrySort}
        />
      </div>
    </Modal>
  )

  useRootModal({ id: 'memoryBook', element: BookModal })

  return (
    <div>
      <h4 class="flex gap-1 text-lg">
        <div>Character Book</div>
        <Button size="sm" onClick={initBlankCharacterBook}>
          Create New Book
        </Button>
      </h4>
      <Show when={!props.bundledBook}>
        <span class="text-sm"> This character doesn't have a Character Book. </span>
        <div class="flex flex-col gap-3 sm:flex-row">
          <Select
            fieldName="memoryBook"
            value={NONE_VALUE}
            items={internalMemoryBookOptions()}
            onChange={pickInternalMemoryBook}
          />
        </div>
      </Show>
      <Show when={props.bundledBook}>
        <span class="text-sm">This character has a Character Book.</span>
        <div class="mt-2 flex gap-3">
          <Button onClick={() => setIsModalShown(true)}>Edit Book</Button>
          <Button onClick={deleteBook}>Delete Book</Button>
        </div>
      </Show>
    </div>
  )
}
