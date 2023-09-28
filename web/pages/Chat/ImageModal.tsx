import { Component, For, createMemo } from 'solid-js'
import { NoTitleModal } from '../../shared/Modal'
import { settingStore } from '../../store'
import { getAssetUrl } from '../../shared/util'
import Button from '/web/shared/Button'

export const ImageModal: Component = () => {
  const state = settingStore()

  const footer = createMemo(() => {
    if (!state.showImage?.options?.length) return null

    return (
      <div class="flex gap-2">
        <For each={state.showImage.options}>
          {(opt) => (
            <Button schema={opt.schema} onClick={opt.onClick}>
              {opt.text}
            </Button>
          )}
        </For>
      </div>
    )
  })

  return (
    <NoTitleModal
      show={!!state.showImage}
      close={settingStore.clearImage}
      maxWidth="half"
      footer={footer()}
    >
      <div class="flex justify-center p-4">
        <img class="rounded-md" src={getAssetUrl(state.showImage!.url)} />
      </div>
    </NoTitleModal>
  )
}
