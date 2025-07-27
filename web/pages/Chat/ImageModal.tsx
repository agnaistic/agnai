import {
  Component,
  For,
  Match,
  Show,
  Switch,
  createEffect,
  createMemo,
  createSignal,
  on,
} from 'solid-js'
import Modal from '../../shared/Modal'
import { ImageButton, settingStore } from '../../store'
import { getAssetUrl } from '../../shared/util'
import Button from '/web/shared/Button'
import { useImageCache } from '/web/shared/hooks'
import TextInput from '/web/shared/TextInput'
import { ArrowLeft, ArrowRight, BrushCleaning, SettingsIcon } from 'lucide-solid'
import { cleanPrompt } from '/common/util'
import { RelativeSpinner } from '/web/shared/Loading'
import { imageApi } from '/web/store/data/image'
import { getStore } from '/web/store/create'

export const ImageModal: Component = () => {
  const state = settingStore()

  return (
    <Switch>
      <Match when={state.showImage?.src.type === 'collection'}>
        <ImageCollectionModal
          collection={state.showImage?.src.id!}
          close={() => settingStore.clearImage()}
          actions={state.showImage?.options!}
          initial={state.showImage?.src.initial}
          onClose={state.showImage?.onClose}
          prompt={state.showImage?.src.prompt}
        />
      </Match>
      <Match when={state.showImage?.src.type === 'url'}>
        <ImageUrlModal
          url={state.showImage?.src.id!}
          close={() => settingStore.clearImage()}
          actions={state.showImage?.options!}
          onClose={state.showImage?.onClose}
        />
      </Match>
      <Match when>{null}</Match>
    </Switch>
  )
}

const ImageUrlModal: Component<{
  url: string
  close: () => void
  actions: ImageButton[]
  onClose?: () => void
}> = (props) => {
  const footer = createMemo(() => {
    return (
      <div class="flex gap-2">
        <For each={props.actions}>
          {(opt) => (
            <Button schema={opt.schema} onClick={() => opt.onClick()}>
              {opt.text}
            </Button>
          )}
        </For>
      </div>
    )
  })

  const close = () => {
    props.onClose?.()
    props.close()
  }

  return (
    <Modal
      show={!!props.url}
      close={close}
      maxWidth="half"
      footer={
        <>
          <Button schema="secondary" onClick={close}>
            Close
          </Button>
          {footer()}
        </>
      }
    >
      <div class="flex justify-center p-4">
        <img class="rounded-md" src={getAssetUrl(props.url)} />
      </div>
    </Modal>
  )
}

const ImageCollectionModal: Component<{
  collection: string
  initial?: number
  close: () => void
  prompt?: string
  actions: ImageButton[]
  onClose?: () => void
}> = (props) => {
  const reel = useImageCache(props.collection, { initial: props.initial })

  const [loading, setLoading] = createSignal(false)
  const [prompt, setPrompt] = createSignal('')

  const title = createMemo(() => `Image: ${reel.state.pos + 1}/${reel.state.images.length}`)

  createEffect(
    on(
      () => props.collection,
      (id) => {
        if (!id) return
        reel.load(id, props.initial)
      }
    )
  )

  createEffect(
    on(
      () => props.prompt,
      (prompt) => {
        setPrompt(prompt || '')
      }
    )
  )

  const close = () => {
    props.onClose?.()
    props.close()
  }

  const onCleanPrompt = () => {
    const cleaned = cleanPrompt(prompt())
    setPrompt(cleaned)
  }

  const generate = async () => {
    if (loading()) return

    const imagePrompt = prompt()

    setLoading(true)

    try {
      const result = await imageApi.generateImageAsync(imagePrompt, {
        model: '',
        noAffix: false,
      })

      reel.addImage(result.image, { id: result.file.name, prompt: imagePrompt })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      show={!!props.collection}
      close={close}
      maxWidth="full"
      title={
        <div class="flex items-center gap-2">
          <div class="icon-button" onClick={() => getStore('settings').imageSettings(true)}>
            <SettingsIcon size={20} />
          </div>
          <div>{title()}</div>
        </div>
      }
      footer={
        <div class="flex h-full w-full items-end justify-center gap-2">
          <Button size="sm" disabled={reel.state.images.length <= 1} onClick={reel.prev}>
            <ArrowLeft size={20} />
          </Button>

          <Button size="sm" onClick={generate} disabled={loading()}>
            Generate
          </Button>

          <Button size="sm" schema="error" onClick={() => reel.removeImage(reel.state.imageId)}>
            Delete Image
          </Button>

          <For each={props.actions}>
            {(action) => (
              <Button
                size="sm"
                schema={action.schema}
                onClick={() => action.onClick({ prompt: prompt(), reel })}
              >
                {action.text}
              </Button>
            )}
          </For>

          <Button size="sm" disabled={reel.state.images.length <= 1} onClick={reel.next}>
            <ArrowRight size={20} />
          </Button>
        </div>
      }
    >
      <div class="grid h-full min-h-0 w-full gap-1" style={{ 'grid-auto-rows': 'auto 1fr' }}>
        <section class="w-full">
          <div class="flex w-full flex-col gap-1">
            <TextInput
              parentClass="w-full !h-[64px]"
              class="!h-[64px] !py-1 !text-sm"
              prelabel="Prompt"
              value={prompt()}
              onChange={(ev) => setPrompt(ev.currentTarget.value)}
              isMultiline
              textarea={{ rows: 2 }}
            />

            <div class="flex w-full justify-end gap-2">
              <Button size="sm" onClick={onCleanPrompt}>
                <BrushCleaning size={20} />
                Clean
              </Button>
            </div>
          </div>
        </section>

        <section class="flex min-h-0 justify-center">
          <Show when={loading()}>
            <div class="bg-900 absolute right-1/2 top-1/2 rounded-lg p-2">
              <RelativeSpinner />
            </div>
          </Show>
          <Show when={!!reel.state.image}>
            <img class="h-full max-h-fit object-cover" src={reel.state.image} />
          </Show>
        </section>
      </div>
    </Modal>
  )
}
