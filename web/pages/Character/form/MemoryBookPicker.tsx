import { Save } from 'lucide-solid'
import { Component, createSignal, createMemo, Show, createEffect, on } from 'solid-js'
import EditMemoryForm, { EntrySort } from '../../Memory/EditMemory'
import { BUNDLED_CHARACTER_BOOK_ID, emptyBook, emptyBookWithEmptyEntry } from '/common/memory'
import { AppSchema } from '/common/types'
import Button from '/web/shared/Button'
import { RootModal } from '/web/shared/Modal'
import Select, { Option } from '/web/shared/Select'
import { characterStore, memoryStore } from '/web/store'
import { createStore } from 'solid-js/store'

export const MemoryBookPicker: Component<{
  bundledBook: AppSchema.MemoryBook | undefined
  setBundledBook: (newVal: AppSchema.MemoryBook | undefined) => void
  characterId: string | undefined
}> = (props) => {
  const memory = memoryStore()
  const [isModalShown, setIsModalShown] = createSignal(false)
  const [entrySort, setEntrySort] = createSignal<EntrySort>('creationDate')
  const updateEntrySort = (item: Option<string>) => {
    if (item.value === 'creationDate' || item.value === 'alpha') {
      setEntrySort(item.value)
    }
  }

  const [state, setState] = createStore<AppSchema.MemoryBook>(emptyBookWithEmptyEntry())

  createEffect(
    on(
      () => props.bundledBook,
      (book) => {
        if (!book) {
          setState(emptyBook())
        } else {
          setState(book)
        }
      }
    )
  )

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

  const onSave = () => {
    if (!props.characterId) return
    characterStore.editPartialCharacter(props.characterId, { characterBook: state }, () => {
      props.setBundledBook(state)
      setIsModalShown(false)
    })
  }

  const ModalFooter = () => (
    <>
      <Button schema="secondary" onClick={() => setIsModalShown(false)}>
        Close
      </Button>
      <Button onClick={onSave}>
        <Save />
        Save Character Book
      </Button>
    </>
  )

  return (
    <>
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
      <RootModal
        title="Character Memory"
        show={isModalShown()}
        close={() => setIsModalShown(false)}
        footer={<ModalFooter />}
        maxWidth="half"
        fixedHeight
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
      </RootModal>
    </>
  )
}
