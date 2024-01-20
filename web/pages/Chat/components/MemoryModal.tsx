import { Save } from 'lucide-solid'
import { Component, createMemo, createSignal, JSX, onMount, Show } from 'solid-js'
import { AppSchema } from '../../../../common/types/schema'
import Button from '../../../shared/Button'
import Divider from '../../../shared/Divider'
import Select, { Option } from '../../../shared/Select'
import { chatStore } from '../../../store'
import { memoryStore } from '../../../store'
import EditMemoryForm, { EntrySort } from '../../Memory/EditMemory'
import EmbedContent from '../../Memory/EmbedContent'
import { A } from '@solidjs/router'
import { useTransContext } from '@mbarzda/solid-i18next'

const ChatMemoryModal: Component<{
  chat: AppSchema.Chat
  close: () => void
  footer?: (children: JSX.Element) => void
}> = (props) => {
  const [t] = useTransContext()

  const state = memoryStore((s) => ({
    books: s.books,
    items: s.books.list.map((book) => ({ label: book.name, value: book._id })),
    embeds: s.embeds,
  }))

  const [id, setId] = createSignal(props.chat.memoryId || 'new')
  const [embedId, setEmbedId] = createSignal(props.chat.userEmbedId)
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
    const update = book()
    if (!id() || !update) return
    memoryStore.update(id(), update)
  }

  const useMemoryBook = () => {
    if (!props.chat._id) return
    chatStore.editChat(props.chat._id, { memoryId: id() }, undefined)
  }

  const useUserEmbed = () => {
    chatStore.editChat(props.chat._id, { userEmbedId: embedId() }, undefined)
  }

  const createMemoryBook = () => {
    memoryStore.create(
      {
        name: 'New Book',
        entries: [],
        description: '',
        extensions: {},
      },
      (book) => {
        changeBook(book._id)
      }
    )
  }

  const Footer = (
    <>
      <Button schema="secondary" onClick={props.close}>
        {t('close')}
      </Button>
      <Button disabled={id() === ''} type="submit" onClick={onSubmit}>
        <Save />
        {t('save_memory_book')}
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
      <div class="flex gap-4">
        <A class="link" href="/guides/memory">
          {t('memory_guide')}
        </A>
      </div>
      <div class="flex flex-col gap-2">
        <Select
          fieldName="memoryId"
          label={t('chat_memory_book')}
          helperText={t('the_memory_book_your_chat_will_use')}
          items={[{ label: t('none'), value: '' }].concat(state.items)}
          value={id()}
          onChange={(item) => {
            changeBook(item.value)
            useMemoryBook()
          }}
        />
        <div>
          <Button onClick={createMemoryBook}>{t('create_new_memory_book')}</Button>
        </div>

        <Divider />
        <Show when={state.embeds.length > 0}>
          <Select
            fieldName="embedId"
            label={t('embedding')}
            helperText={t('which_user_created_embedding_to_use')}
            items={embeds()}
            onChange={(item) => setEmbedId(item.value)}
            value={embedId()}
          />
          <Button
            class="w-fit"
            disabled={embedId() === props.chat.userEmbedId}
            onClick={useUserEmbed}
          >
            <Save />
            {t('use_embedding')}
          </Button>
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
              onChange={setBook}
            />
          </div>
        </Show>
      </div>
    </>
  )
}

export default ChatMemoryModal
