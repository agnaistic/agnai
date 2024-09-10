import { Edit, Save } from 'lucide-solid'
import { Component, createEffect, createMemo, createSignal, JSX, onMount, Show } from 'solid-js'
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

const ChatMemoryModal: Component<{
  chat: AppSchema.Chat | undefined
  close: () => void
  footer?: (children: JSX.Element) => void
}> = (props) => {
  const state = memoryStore((s) => ({
    books: s.books,
    items: s.books.list.map((book) => ({ label: book.name, value: book._id })),
    embeds: s.embeds,
  }))

  const [id, setId] = createSignal('')
  const [embedId, setEmbedId] = createSignal(props.chat?.userEmbedId)
  const [editingEmbed, setEditingEmbed] = createSignal<boolean>(false)
  const [book, setBook] = createSignal<AppSchema.MemoryBook>()
  const [entrySort, setEntrySort] = createSignal<EntrySort>('creationDate')
  const updateEntrySort = (item: Option<string>) => {
    if (item.value === 'creationDate' || item.value === 'alpha') {
      setEntrySort(item.value)
    }
  }

  const changeBook = async (id: string) => {
    setId(id === 'new' ? '' : id)
    setBook(undefined)
    await Promise.resolve()

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
        : state.books.list.find((book) => book._id === id)

    setBook(match)
  }

  createEffect(() => {
    if (!props.chat) return
    if (!props.chat.memoryId) return

    console.log(props.chat.memoryId)

    if (props.chat.memoryId && !id()) {
      changeBook(props.chat.memoryId)
    }
  })

  const onSubmit = (ev: Event) => {
    ev.preventDefault()
    const update = book()

    if (!update) return

    if (id() === '') {
      memoryStore.create(update, (next) => {
        setId(next._id)
        setBook(next)
        useMemoryBook()
      })
    } else {
      memoryStore.update(id(), update)
    }
  }

  const useMemoryBook = (nextId?: string) => {
    if (!props.chat?._id) return
    chatStore.editChat(
      props.chat._id,
      { memoryId: nextId === undefined ? id() : nextId },
      undefined
    )
  }

  const useUserEmbed = () => {
    if (!props.chat?._id) return
    chatStore.editChat(props.chat._id, { userEmbedId: embedId() }, undefined)
  }

  const Footer = (
    <>
      <Button schema="secondary" onClick={props.close}>
        Close
      </Button>
      <Button disabled={book() === undefined} type="submit" onClick={onSubmit}>
        <Save />
        Save Memory Book
      </Button>
    </>
  )

  const embeds = createMemo(() => {
    return [{ label: 'None', value: '' }].concat(
      state.embeds.map((em) => ({ label: `${em.id} [${em.state}]`, value: em.id }))
    )
  })

  onMount(() => {
    props.footer?.(Footer)
  })

  return (
    <>
      <div class="flex flex-col gap-2">
        <Select
          fieldName="memoryId"
          label="Chat Memory Book"
          helperText="The memory book your chat will use"
          items={[{ label: 'None', value: '' }].concat(state.items)}
          value={props.chat?.memoryId}
          onChange={(item) => {
            changeBook(item.value)
            useMemoryBook(item.value)
          }}
        />
        <div>
          <Button onClick={() => changeBook('new')}>Create New Memory Book</Button>
        </div>

        <Divider />
        <Show when={state.embeds.length > 0}>
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

            <Show when={embedId() === props.chat?.userEmbedId}>
              <Button
                class="w-fit"
                schema="secondary"
                disabled={editingEmbed() || !props.chat?.userEmbedId}
                onClick={() => setEditingEmbed(true)}
              >
                <Edit />
                Edit
              </Button>
            </Show>
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

        <Show when={book()}>
          <div class="text-sm">
            <EditMemoryForm
              hideSave
              book={book()!}
              entrySort={entrySort()}
              updateEntrySort={updateEntrySort}
              onChange={(next) => {
                const prev = book()!
                setBook({ ...prev, ...next })
              }}
            />
          </div>
        </Show>
      </div>
    </>
  )
}

export default ChatMemoryModal
