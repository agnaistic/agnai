import { Component, createEffect, createSignal, For, on, onMount, Show } from 'solid-js'
import { AppSchema } from '/common/types'
import { getAssetUrl, storage } from '/web/shared/util'
import { hydrateMessageImages, msgStore } from '/web/store/message'
import { Pencil, PlusCircle, X } from 'lucide-solid'
import { MessageImagePrompt } from './MessageMeta'
import Button from '/web/shared/Button'
import { ICON_SIZES } from '/web/icons/AppIcon'
import { ImageButton, imageStore } from '/web/store/images'

type MessageImage = {
  src: string
  btn?: ImageButton
}

export const MessageImages: Component<{ msg: AppSchema.ChatMessage; onEditClick: () => void }> = (
  props
) => {
  const [images, setImages] = createSignal<MessageImage[]>([])
  const [showPrompt, setShowPrompt] = createSignal(false)

  createEffect(
    on(
      () => props.msg.extras,
      async (extras) => {
        const next: MessageImage[] = []

        let index = 0
        for (const img of extras || []) {
          const src = img.startsWith('cache:') ? await storage.getItem(img) : img
          if (!src) {
            index++
            continue
          }

          const btn = toImageDeleteButton(props.msg._id, ++index)
          next.push({ src, btn })
        }

        setImages(next)
      }
    )
  )

  onMount(() => hydrateMessageImages(props.msg._id))

  return (
    <>
      <Show when={showPrompt()}>
        <MessageImagePrompt msg={props.msg} close={() => setShowPrompt(false)}>
          <Button size="sm" onClick={() => setShowPrompt(false)}>
            <X size={ICON_SIZES.PILL} />
          </Button>
        </MessageImagePrompt>
      </Show>

      <div class="flex flex-wrap gap-2" classList={{ hidden: images().length === 0 }}>
        <For each={images()}>
          {(img, pos) => (
            <img
              class="mt-2 max-h-12 max-w-[unset] cursor-pointer rounded-md sm:max-h-16"
              src={getAssetUrl(img.src)}
              onClick={() =>
                imageStore.showMessageImages({
                  id: props.msg._id,
                  position: pos(),
                })
              }
            />
          )}
        </For>

        <Show when={images().length || !!props.msg.imagePrompt}>
          <div class="ml-2 flex items-center gap-3">
            <div
              class="icon-button"
              onClick={() =>
                msgStore.createImage({
                  sourceMsgId: props.msg._id,
                  append: true,
                })
              }
            >
              <PlusCircle size={16} />
            </div>

            <div
              class="icon-button"
              onClick={() => {
                setShowPrompt(true)
                // props.onEditClick()
              }}
            >
              <Pencil size={16} />
            </div>
          </div>
        </Show>
      </div>
    </>
  )
}

function toImageDeleteButton(msgId: string, position: number) {
  return {
    schema: 'red' as const,
    text: 'Delete Image',
    onClick: () => {
      msgStore.removeMessageImage(msgId, position)
      imageStore.clearImage()
    },
  }
}
