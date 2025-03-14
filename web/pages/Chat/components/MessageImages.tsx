import { Component, createEffect, createSignal, For, on, onMount, Show } from 'solid-js'
import { AppSchema } from '/common/types'
import { getAssetUrl, storage } from '/web/shared/util'
import { settingStore } from '/web/store/settings'
import { deleteCachedMessageImage, getMessageImages, msgStore } from '/web/store/message'
import { PlusCircle } from 'lucide-solid'
import { ButtonSchema } from '/web/shared/Button'

type MessageImage = {
  src: string
  btn?: ImageButton
}

type ImageButton = {
  schema: ButtonSchema
  text: string
  onClick: () => void
}

export const MessageImages: Component<{ msg: AppSchema.ChatMessage }> = (props) => {
  const [images, setImages] = createSignal<MessageImage[]>([])

  const load = async () => {
    // Do not attempt to load images for a new message
    if (!props.msg._id) return

    const next: MessageImage[] = []
    const extras = (props.msg.extras || []).slice()
    const cached = await getMessageImages(props.msg._id)
    const seen = new Set<string>()

    if (
      props.msg.adapter === 'image' &&
      (props.msg.msg.startsWith('http') || props.msg.msg.startsWith('cache:'))
    ) {
      const btn = toImageDeleteButton(props.msg._id, 0)
      next.push({ src: props.msg.msg, btn })
    }

    for (const extra of cached) {
      if (typeof extra !== 'string') continue

      if (extra.startsWith('cache:')) {
        if (seen.has(extra)) continue
        seen.add(extra)

        const btn: ImageButton = {
          schema: 'red',
          text: 'Delete Image',
          onClick: async () => {
            await deleteCachedMessageImage(props.msg._id, extra)
            settingStore.clearImage()
            load()
          },
        }

        const img = await storage.getItem(extra)
        if (img) next.push({ src: img, btn })
        continue
      }

      if (extra.includes('data:image')) {
        next.push({ src: extra })
        continue
      }
    }

    let position = props.msg.adapter === 'image' ? 1 : 0
    for (const extra of extras) {
      const btn = toImageDeleteButton(props.msg._id, position)
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

    setImages(next)
  }

  createEffect(on(() => props.msg.extras, load))
  onMount(load)

  return (
    <div class="flex flex-wrap gap-2">
      <For each={images()}>
        {(img) => (
          <img
            class="mt-2 max-h-32 max-w-[unset] cursor-pointer rounded-md"
            src={getAssetUrl(img.src)}
            onClick={() => settingStore.showImage(img.src, img.btn ? [img.btn] : [])}
          />
        )}
      </For>

      <Show when={images().length}>
        <div
          class="icon-button mx-2 flex items-center"
          onClick={() => msgStore.createImage(props.msg._id, true)}
        >
          <PlusCircle size={20} />
        </div>
      </Show>
    </div>
  )
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
