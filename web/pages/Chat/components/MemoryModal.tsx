import { Save } from 'lucide-solid'
import { Component, createMemo, createSignal, Show } from 'solid-js'
import { AppSchema } from '../../../../srv/db/schema'
import Button from '../../../shared/Button'
import Divider from '../../../shared/Divider'
import Dropdown from '../../../shared/Dropdown'
import Modal from '../../../shared/Modal'
import { chatStore } from '../../../store'
import { memoryStore } from '../../../store'
import EditMemoryForm, { getBookUpdate } from '../../Memory/EditMemory'

const ChatMemoryModal: Component<{
  chat: AppSchema.Chat
  book?: AppSchema.MemoryBook
  show: boolean
  close: () => void
}> = (props) => {
  const state = memoryStore((s) => ({
    books: s.books.list,
    items: s.books.list.map((book) => ({ label: book.name, value: book._id })),
  }))

  const [id, setId] = createSignal(props.chat.memoryId || '')
  const book = createMemo(() => {
    if (!id()) return
    const match = state.books.find((book) => book._id === id())
    return match
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
      <Button schema="secondary">Close</Button>
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
    >
      <div class="flex flex-col gap-2">
        <div class="flex items-end justify-between">
          <Dropdown
            fieldName="memoryId"
            label="Chat Memory Book"
            helperText="The memory book your chat will use"
            items={[{ label: 'None', value: '' }].concat(state.items)}
            value={id()}
            onChange={(item) => setId(item.value)}
          />
          <Button
            disabled={id() === (props.chat.memoryId || '')}
            class="h-fit w-fit"
            onClick={useMemoryBook}
          >
            <Save />
            Use Memory Book
          </Button>
        </div>
        <Divider />

        <Show when={book()}>
          <div class="text-sm">
            <EditMemoryForm hideSave book={book()!} />
          </div>
        </Show>
      </div>
    </Modal>
  )
}

export default ChatMemoryModal
