import { Edit, Save } from 'lucide-solid'
import { Component, createEffect, createMemo, createSignal, JSX, on, Show } from 'solid-js'
import { AppSchema } from '../../../../common/types/schema'
import Button from '../../../shared/Button'
import Divider from '../../../shared/Divider'
import Select from '../../../shared/Select'
import { chatStore } from '../../../store'
import { memoryStore } from '../../../store'
import EmbedContent from '../../Memory/EmbedContent'
import { EditEmbedModal } from '/web/shared/EditEmbedModal'
import { Portal } from 'solid-js/web'
import { embedApi } from '/web/store/embeddings'
import { ManageMemoryBooks } from './ManageMemoryBooks'

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

  createEffect(
    on(
      () => props.chat?.userEmbedId,
      (id) => {
        if (!id) return
        setEmbedId(id)
      }
    )
  )

  const useUserEmbed = () => {
    if (!props.chat?._id) return
    const id = embedId()
    chatStore.editChat(props.chat._id, { userEmbedId: id })

    if (id) {
      embedApi.loadDocument(id)
    }
  }

  const embeds = createMemo(() => {
    return [{ label: 'None', value: '' }].concat(
      books.embeds.map((em) => ({ label: `${em.name} [${em.state}]`, value: em.id }))
    )
  })

  return (
    <>
      <div class="flex flex-col gap-2">
        <ManageMemoryBooks
          bookIds={props.chat?.memoryId || ''}
          updateIds={(next) => {
            if (!props.chat?._id) return
            chatStore.editChat(props.chat?._id, { memoryId: next })
          }}
        />

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

            <Button
              class="w-fit"
              disabled={editingEmbed() || !embedId()}
              onClick={() => setEditingEmbed(true)}
            >
              <Edit size={16} />
              Edit
            </Button>

            <Button
              schema="error"
              class="w-fit"
              disabled={!embedId()}
              onClick={() => embedApi.removeDocument(embedId()!)}
            >
              Remove
            </Button>
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
      </div>
    </>
  )
}

export default ChatMemoryModal
