import { Component, createMemo, For, Show } from 'solid-js'
import { ContextState } from '/web/store/context'
import { AppSchema } from '/common/types'
import { msgStore, settingStore } from '/web/store'
import { CircleX } from 'lucide-solid'
import Tooltip from '/web/shared/Tooltip'

export const MessageAttachments: Component<{ ctx: ContextState; msg: AppSchema.ChatMessage }> = (
  props
) => {
  const attachments = createMemo(() => {
    const list = props.ctx.attachments[props.msg._id]
    if (!list?.length) return []

    const images: string[] = []

    for (const item of list) {
      if (item.type !== 'image') continue
      images.push(item.image)
    }

    return images
  })

  return (
    <>
      <div class="flex flex-wrap gap-2">
        <For each={attachments()}>
          {(image, index) => (
            <img
              class="max-h-8 cursor-pointer rounded-md sm:max-h-12"
              src={image}
              onClick={() =>
                settingStore.showImage(image, [
                  {
                    schema: 'warning',
                    text: 'Remove',
                    onClick: () => {
                      settingStore.clearImage()
                      msgStore.removeAttachment(props.msg._id, index())
                    },
                  },
                ])
              }
            />
          )}
        </For>
        <Show when={attachments().length > 0}>
          <div
            class="icon-button flex items-center"
            onClick={() => msgStore.removeAttachment(props.msg._id, -1)}
          >
            <Tooltip tip="Remove all" position="top">
              <CircleX size={20} />
            </Tooltip>
          </div>
        </Show>
      </div>
    </>
  )
}
