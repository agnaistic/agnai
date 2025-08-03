import { Component, createEffect, createSignal, For, on, onMount, Setter, Show } from 'solid-js'
import { AppSchema } from '/common/types'
import { getAssetUrl, storage } from '/web/shared/util'
import { ImageButton, settingStore } from '/web/store/settings'
import { getMessageImages, msgStore } from '/web/store/message'
import { Pencil, PlusCircle, X } from 'lucide-solid'
import { MessageImagePrompt } from './MessageMeta'
import Button from '/web/shared/Button'
import { ICON_SIZES } from '/web/icons/AppIcon'

type MessageImage = {
  src: string
  btn?: ImageButton
}

export const MessageImages: Component<{ msg: AppSchema.ChatMessage; onEditClick: () => void }> = (
  props
) => {
  const [images, setImages] = createSignal<MessageImage[]>([])
  const [showPrompt, setShowPrompt] = createSignal(false)

  const reloadImages = () => {
    loadImages(props.msg, (imgs) => {
      setImages(imgs)
    })
  }

  createEffect(on(() => props.msg.extras, reloadImages))

  onMount(reloadImages)

  return (
    <>
      <Show when={showPrompt()}>
        <MessageImagePrompt msg={props.msg}>
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
                settingStore.showMessageImages({
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
              class="icon-button m"
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

async function loadImages(msg: AppSchema.ChatMessage, setter: Setter<MessageImage[]>) {
  if (!msg._id) return

  const next: MessageImage[] = []
  const extras = (msg.extras || []).slice()
  const cached = await getMessageImages(msg._id)
  const seen = new Set<string>()

  if (msg.adapter === 'image' && (msg.msg.startsWith('http') || msg.msg.startsWith('cache:'))) {
    const btn = toImageDeleteButton(msg._id, 0)
    next.push({ src: msg.msg, btn })
  }

  for (const extra of cached) {
    if (typeof extra !== 'string') continue

    if (extra.startsWith('cache:')) {
      if (seen.has(extra)) continue
      seen.add(extra)

      const img = await storage.getItem(extra)
      if (img) next.push({ src: img })
      continue
    }

    if (extra.includes('data:image')) {
      next.push({ src: extra })
      continue
    }
  }

  let position = msg.adapter === 'image' ? 1 : 0
  for (const extra of extras) {
    const btn = toImageDeleteButton(msg._id, position)
    if (extra.startsWith('cache:')) {
      if (seen.has(extra)) continue
      seen.add(extra)
      const img = await storage.getItem(extra)
      if (img) next.push({ src: img, btn })

      position++
      continue
    }

    next.push({ src: extra, btn })
    position++
    continue
  }

  setter(next)
}

function toImageDeleteButton(msgId: string, position: number) {
  return {
    schema: 'red' as const,
    text: 'Delete Image',
    onClick: () => {
      msgStore.removeMessageImage(msgId, position)
      settingStore.clearImage()
    },
  }
}
