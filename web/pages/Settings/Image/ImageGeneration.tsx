import { Component, createEffect, createMemo, createSignal, on, Show } from 'solid-js'
import { RootModal } from '/web/shared/Modal'
import { getStore } from '/web/store/create'
import { imageApi } from '/web/store/data/image'
import { ImageHost, ImageSamplers } from '/common/types/presets'
import { SD_SAMPLER } from '/common/image'
import { createStore } from 'solid-js/store'
import TextInput from '/web/shared/TextInput'
import { isChatPage, useImageCache } from '/web/shared/hooks'
import { RelativeSpinner } from '/web/shared/Loading'
import Button from '/web/shared/Button'
import { ArrowLeft, ArrowRight, BrushCleaning, SettingsIcon, WandSparkles } from 'lucide-solid'
import { createEmitter } from '/web/shared/util'

// type GenState = {
//   fullWidth: boolean
//   lastPrompt: string
// }

export const GenerateImageModal: Component = () => {
  const isChat = isChatPage()
  const user = getStore('user')((s) => ({ id: s.user?._id || 'guest', image: s.user?.images }))
  const reel = useImageCache(`img-gen-${user.id}`, { clean: true })
  const emitter = createEmitter('width')
  const [state, setters] = useImageContext({ prompt: '' })
  const settings = getStore('settings')((s) => ({ ...s.imggen }))

  const [loading, setLoading] = createSignal(false)

  const generate = async () => {
    if (loading()) return

    setLoading(true)

    try {
      const result = await imageApi.generateImageAsync(state.prompt, {
        model: '',
        noAffix: false,
      })

      reel.addImage(result.image, { id: result.file.name, prompt: state.prompt })
    } finally {
      setLoading(false)
    }
  }

  const canGeneratePrompt = createMemo(() => {
    if (!isChat()) return false
    return true
  })

  const generatePrompt = async () => {
    if (!canGeneratePrompt()) return
    getStore('messages').generateImagePrompt({
      onSummary: (summary) => setters.update('prompt', summary),
      onTick: (res, state) => (state === 'partial' ? setters.update('prompt', res) : null),
    })
  }

  const close = () => getStore('settings').closeImageGen()

  const cleanPrompt = () => {
    const next = state.prompt.replace(/[^0-9a-z_\-,\s\.]/gi, '').trim()
    setters.update({ prompt: next })
  }

  createEffect(
    on(
      () => settings.show,
      (show) => {
        if (!show) return
        setters.update({ prompt: settings.prompt || '' })
      }
    )
  )

  return (
    <RootModal
      show={settings.show}
      close={close}
      maxWidth="full"
      fixedHeight
      disableResize
      emitter={emitter}
      maxHeight
      title={
        <>
          <div class="icon-button" onClick={() => getStore('settings').imageSettings(true)}>
            <SettingsIcon size={20} />
          </div>
        </>
      }
      footer={
        <div class="flex h-full w-full items-end justify-center gap-2">
          <Button size="sm" disabled={reel.state.images.length <= 1} onClick={reel.prev}>
            <ArrowLeft size={20} />
          </Button>

          <Button size="sm" onClick={generate}>
            Generate
          </Button>

          <Show when={settings.action}>
            <Button size="sm" onClick={() => settings.action?.handler(reel.state.image)}>
              {settings.action?.text || ''}
            </Button>
          </Show>

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
              value={state.prompt}
              onChange={(ev) => setters.update('prompt', ev.currentTarget.value)}
              isMultiline
              textarea={{ rows: 2 }}
            />

            <div class="flex w-full justify-end gap-2">
              <Button size="sm" onClick={cleanPrompt}>
                <BrushCleaning size={20} />
                Clean
              </Button>
              <Show when={canGeneratePrompt()}>
                <Button size="sm" disabled={loading()} onClick={generatePrompt}>
                  <WandSparkles size={20} />
                </Button>
              </Show>
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
    </RootModal>
  )
}

type ImageState = ImageSamplers & { prompt: string; negative: string; type: ImageHost }

function useImageContext(initialState?: Partial<ImageState>) {
  const [store, setStore] = createStore({ ...init(), ...initialState })

  return [store, { update: setStore, reset: () => setStore(init()) }] as const
}

const init = (): ImageState => {
  return {
    type: 'novel',
    prompt: '',
    negative: '',
    cfg: 5,
    clipSkip: 2,
    draftMode: false,
    height: 1024,
    width: 1024,

    qualityTags: true,
    ucPreset: '0',
    sampler: SD_SAMPLER['DPM++ 2M'],
    steps: 28,
  }
}
