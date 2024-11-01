import { Check, X } from 'lucide-solid'
import { Component, Show, createEffect, createSignal } from 'solid-js'
import Button from '../../shared/Button'
import Modal from '../../shared/Modal'
import { memoryStore, toastStore } from '../../store'
import EditMemoryForm, { EntrySort } from '../Memory/EditMemory'
import { AppSchema } from '/common/types'
import { Option } from '/web/shared/Select'
import { emptyBookWithEmptyEntry } from '/common/memory'
import { createStore } from 'solid-js/store'

const ChubImportBookModal: Component<{
  show: boolean
  close: () => void
  id?: string
  book: AppSchema.MemoryBook
  fullPath: string
}> = (props) => {
  let ref: any
  const [book, setBook] = createSignal<AppSchema.MemoryBook>(props.book)
  const [state, setState] = createStore<AppSchema.MemoryBook>(emptyBookWithEmptyEntry())
  const [entrySort, setEntrySort] = createSignal<EntrySort>('creationDate')
  const updateEntrySort = (item: Option<string>) => {
    if (item.value === 'creationDate' || item.value === 'alpha') {
      setEntrySort(item.value)
    }
  }

  createEffect(() => {
    if (props.book.name) setBook(props.book)
  })

  const onImport = () => {
    try {
      memoryStore.create(state)
    } catch (error) {
      toastStore.error(`Error importing ${state.name}! ${error}`)
    }
    props.close()
  }

  return (
    <Modal
      show={props.show}
      close={props.close}
      title={
        <>
          Preview
          <a href={`https://chub.ai/${props.fullPath}`} class="text-[var(--hl-500)]">
            {' '}
            {book()?.name}
          </a>
        </>
      }
      maxWidth="half"
      footer={
        <>
          <Button schema="secondary" onClick={props.close}>
            <X />
            Close
          </Button>

          <Button onClick={onImport} disabled={!book()}>
            <Check />
            Import
          </Button>
        </>
      }
    >
      <form ref={ref}>
        <div class="mb-2 text-sm">
          Optionally modify all the aspects of the memory book other than the image.
        </div>
        <div class="mb-4 text-sm">
          The information provided here will be saved with the memory book on import.
        </div>
        <Show when={book().name}>
          <div class="text-sm">
            <EditMemoryForm
              hideSave
              state={book()}
              entrySort={entrySort()}
              updateEntrySort={updateEntrySort}
              setter={setState}
            />
          </div>
        </Show>
      </form>
    </Modal>
  )
}

export default ChubImportBookModal
