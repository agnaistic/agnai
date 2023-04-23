import { Save } from 'lucide-solid'
import { Component, createMemo, createSignal, onMount, Show } from 'solid-js'
import { AppSchema } from '../../../../srv/db/schema'
import Button from '../../../shared/Button'
import Divider from '../../../shared/Divider'
import Select, { Option } from '../../../shared/Select'
import Modal from '../../../shared/Modal'
import { chatStore } from '../../../store'
import { memoryStore } from '../../../store'
import EditMemoryForm, { getBookUpdate, EntrySort } from '../../Memory/EditMemory'

const ChatMemoryModal: Component<{
  chat: AppSchema.Chat
  show: boolean
  close: () => void
}> = (props) => {
  const state = memoryStore((s) => ({
    books: s.books,
    items: s.books.list.map((book) => ({ label: book.name, value: book._id })),
  }))

  const [id, setId] = createSignal(props.chat.memoryId || '')
  const [book, setBook] = createSignal<AppSchema.MemoryBook>()
  const [entrySort, setEntrySort] = createSignal<EntrySort>('creationDate')
  const updateEntrySort = (item: Option<string>) => {
    if (item.value === 'creationDate' || item.value === 'alpha') {
      setEntrySort(item.value)
    }
  }

  const changeBook = async (id: string) => {
    setId(id)
    setBook(undefined)
    await Promise.resolve()

    const match = state.books.list.find((book) => book._id === id)
    setBook(match)
  }

  onMount(() => {
    changeBook(props.chat.memoryId || '')
  })

  const onSubmit = (ev: Event) => {
    ev.preventDefault()
    if (!id()) return
    const update = getBookUpdate(ev)
    memoryStore.update(id(), update)
  }

  const useMemoryBook = () => {
    if (!props.chat._id) return
    chatStore.editChat(props.chat._id, { memoryId: id() })
  }

  const Footer = () => (
    <>
      <Button schema="secondary" onClick={props.close}>
        Close
      </Button>
      <Button disabled={id() === ''} type="submit">
        <Save />
        Save Memory Book
      </Button>
    </>
  )

  return (
    <Modal
      title="Chat Memory"
      show={props.show}
      close={props.close}
      footer={<Footer />}
      onSubmit={onSubmit}
      maxWidth="half"
      fixedHeight
    >
      <div class="flex flex-col gap-2">
        <Select
          fieldName="memoryId"
          label="Chat Memory Book"
          helperText="The memory book your chat will use"
          items={[{ label: 'None', value: '' }].concat(state.items)}
          value={id()}
          onChange={(item) => changeBook(item.value)}
        />
        <Button
          disabled={id() === (props.chat.memoryId || '')}
          class="h-fit w-fit"
          onClick={useMemoryBook}
        >
          <Save />
          Use Memory Book
        </Button>
        <Divider />

        <Show when={book()}>
          <div class="text-sm">
            <EditMemoryForm
              hideSave
              book={book()!}
              entrySort={entrySort()}
              updateEntrySort={updateEntrySort}
            />
          </div>
        </Show>
      </div>
    </Modal>
  )
}

export default ChatMemoryModal
