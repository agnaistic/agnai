import { Check, X } from 'lucide-solid'
import { Component, Show, createEffect, createSignal } from 'solid-js'
import Button from '../../shared/Button'
import Modal from '../../shared/Modal'
import { memoryStore, toastStore } from '../../store'
import EditMemoryForm, { EntrySort } from '../Memory/EditMemory'
import { AppSchema } from '/common/types'
import { Option } from '/web/shared/Select'
import { useTransContext } from '@mbarzda/solid-i18next'

const ChubImportBookModal: Component<{
  show: boolean
  close: () => void
  id?: string
  book: AppSchema.MemoryBook
  fullPath: string
}> = (props) => {
  const [t] = useTransContext()

  let ref: any
  const [book, setBook] = createSignal<AppSchema.MemoryBook>(props.book)
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
      memoryStore.create(book())
    } catch (error) {
      toastStore.error(t('error_importing_name_x_message_x', { name: book().name, message: error }))
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
            {t('close')}
          </Button>

          <Button onClick={onImport} disabled={!book()}>
            <Check />
            {t('import')}
          </Button>
        </>
      }
    >
      <form ref={ref}>
        <div class="mb-2 text-sm">{t('optionally_modify_all_the_aspects_of_the_memory_book')}</div>
        <div class="mb-4 text-sm">
          {t('the_information_provided_here_will_be_saved_with_the_memory_book')}
        </div>
        <Show when={book().name}>
          <div class="text-sm">
            <EditMemoryForm
              hideSave
              book={book()}
              entrySort={entrySort()}
              updateEntrySort={updateEntrySort}
              onChange={setBook}
            />
          </div>
        </Show>
      </form>
    </Modal>
  )
}

export default ChubImportBookModal
