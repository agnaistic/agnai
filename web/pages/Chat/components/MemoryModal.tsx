import { Edit, Save } from 'lucide-solid'
import { Component, createEffect, createMemo, createSignal, JSX, on, onMount, Show } from 'solid-js'
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

  const [embedId, setEmbedId] = createSignal(props.chat?.userEmbedId)
  const [editingEmbed, setEditingEmbed] = createSignal<boolean>(false)
  const [state, setState] = createStore<AppSchema.MemoryBook>(emptyBook())
  const [entrySort, setEntrySort] = createSignal<EntrySort>('creationDate')
  const updateEntrySort = (item: Option<string>) => {
    if (item.value === 'creationDate' || item.value === 'alpha') {
      setEntrySort(item.value)
    }
  }

  createEffect(
    on(
      () => props.chat?.userEmbedId,
      (id) => {
        if (!id) return
        setEmbedId(id)
      }
    )
  )

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
  }

  createEffect(() => {
    if (!props.chat) return
    if (!props.chat.memoryId) return

    if (props.chat.memoryId) {
      changeBook(props.chat.memoryId)
    }
  })

  const onSubmit = () => {
    if (!state._id) {
      memoryStore.create(state, (next) => {
        setState('_id', next._id)
        useMemoryBook(next._id)
      })
    } else {
      memoryStore.update(state._id, state)
    }
  }

  const useMemoryBook = (nextId?: string) => {
    if (!props.chat?._id) return
    chatStore.editChat(
      props.chat._id,
      { memoryId: nextId === undefined ? state._id : nextId },
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
      <Button onClick={onSubmit}>
        <Save />
        Save Memory Book
      </Button>
    </>
  )

  const embeds = createMemo(() => {
    return [{ label: 'None', value: '' }].concat(
      books.embeds.map((em) => ({ label: `${em.id} [${em.state}]`, value: em.id }))
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
          items={[{ label: 'None', value: '' }].concat(books.items)}
          value={state._id}
          onChange={(item) => {
            changeBook(item.value)
            useMemoryBook(item.value)
          }}
        />
        <div>
          <Button onClick={() => changeBook('new')}>Create New Memory Book</Button>
        </div>

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

            <Show when={embedId() === props.chat?.userEmbedId}>
              <Button
                class="w-fit"
                schema="secondary"
                disabled={editingEmbed() || !props.chat?.userEmbedId}
                onClick={() => setEditingEmbed(true)}
              >
                <Edit size={16} />
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

        <div class="text-sm">
          <EditMemoryForm
            hideSave
            state={state}
            entrySort={entrySort()}
            updateEntrySort={updateEntrySort}
            setter={setState}
          />
        </div>
      </div>
    </>
  )
}

export default ChatMemoryModal
