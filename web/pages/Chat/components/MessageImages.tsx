import { Component, createEffect, createMemo, createSignal, For, on, Show } from 'solid-js'
import { AppSchema } from '/common/types'
import { getAssetUrl, storage } from '/web/shared/util'
import { getMessageImages, msgStore } from '/web/store/message'
import { Pencil, PlusCircle } from 'lucide-solid'
import { MessageImagePrompt } from './MessageMeta'
import { ImageButton, imageStore } from '/web/store/images'
import { ChatContext } from '/web/store/context'
import { RelativeSpinner } from '/web/shared/Loading'

type MessageImage = {
  src: string
  btn?: ImageButton
}

export const MessageImages: Component<{
  msg: AppSchema.ChatMessage
  onEditClick: () => void
  ctx: ChatContext
  messageId: string
}> = (props) => {
  const [images, setImages] = createSignal<MessageImage[]>([])
  const [showPrompt, setShowPrompt] = createSignal(false)
  const [override, setOverride] = createSignal('')

  const generating = createMemo(() => {
    return (
      props.ctx.imgWaiting?.messageId === props.msg._id ||
      props.ctx.imgPrompt?.messageId === props.msg._id
    )
  })

  const canShow = createMemo(() => {
    const progress = generating()
    const show = images().length > 0 || !!props.msg.imagePrompt || !!props.msg.json?.imageCaption
    return show || progress
  })

  createEffect(
    on(
      () => props.messageId,
      async () => {
        const real = await getMessageImages(props.messageId)
        const next: MessageImage[] = []

        let index = 0
        for (const img of real) {
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

  return (
    <>
      <Show when={showPrompt()}>
        <MessageImagePrompt
          msg={props.msg}
          close={() => setShowPrompt(false)}
          onPrompt={(next) => setOverride(next)}
          onClose={() => setOverride('')}
        ></MessageImagePrompt>
      </Show>

      <div class="flex flex-wrap gap-2" classList={{ hidden: !canShow() }}>
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

        <Show
          when={
            props.ctx.imgWaiting?.messageId === props.msg._id ||
            props.ctx.imgPrompt?.messageId === props.msg._id
          }
        >
          <img
            class="mt-2 max-h-12 max-w-[unset] rounded-md sm:max-h-16"
            classList={{ hidden: !props.ctx.imgPreview }}
            src={props.ctx.imgPreview}
          />
          <Show when={!props.ctx.imgPreview}>
            <RelativeSpinner class="flex items-center" speed={props.ctx.imgWaiting?.pos ?? 1} />{' '}
          </Show>
          <span
            class="text-500 text-xs italic"
            classList={{ hidden: !props.ctx.status?.wait_time }}
          >
            {props.ctx.status?.wait_time || '0'}s
          </span>
        </Show>

        <div class="ml-2 flex min-h-[40px] items-center gap-3">
          <div
            class="icon-button"
            onClick={() =>
              msgStore.createImage({
                prompt: override().trim(),
                sourceMsgId: props.msg._id,
                append: true,
                onImage: () =>
                  imageStore.showMessageImages({ id: props.msg._id, position: Infinity }),
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
