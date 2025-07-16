import { Component, createSignal, Show } from 'solid-js'
import { RootModal } from '/web/shared/Modal'
import { getStore } from '/web/store/create'
import { imageApi } from '/web/store/data/image'
import { ImageHost, ImageSamplers } from '/common/types/presets'
import { SD_SAMPLER } from '/common/image'
import { createStore } from 'solid-js/store'
import TextInput from '/web/shared/TextInput'
import { useImageCache } from '/web/shared/hooks'
import { RelativeSpinner } from '/web/shared/Loading'
import Button from '/web/shared/Button'
import { ArrowLeft, ArrowRight } from 'lucide-solid'
import { createOnEnter } from '/web/store/chub'

export const GenerateImageModal: Component = () => {
  const reel = useImageCache('img-gen-ui', { clean: false })
  const [state, setters] = useImageContext()
  const settings = getStore('settings')((s) => ({ show: s.showImgGen }))

  const [loading, setLoading] = createSignal(false)

  const generate = async () => {
    if (loading()) return

    setLoading(true)

    try {
      const result = await imageApi.generateImageAsync(state.prompt, {
        model: '',
        noAffix: true,
      })

      reel.addImage(result.image, result.file.name)
    } finally {
      setLoading(false)
    }
  }

  const close = () => getStore('settings').imageGeneration(false)

  return (
    <RootModal show={settings.show} close={close} maxWidth="full" maxHeight>
      <div class="flex h-full  w-full flex-col justify-between gap-1">
        <section class="w-full">
          <TextInput
            class="!py-1"
            prelabel="Prompt"
            value={state.prompt}
            onChange={(ev) => setters.update('prompt', ev.currentTarget.value)}
            onKeyUp={createOnEnter(generate)}
          />
        </section>

        <section class="flex max-h-[calc(100%-100px)] w-full items-center justify-center">
          <Show when={loading()}>
            <div class="absolute right-1/2 top-1/2">
              <RelativeSpinner />
            </div>
          </Show>
          <Show when={!!reel.state.image}>
            <img class="h-full" src={reel.state.image} />
          </Show>
        </section>

        <section class="flex w-full justify-center gap-4">
          <Button size="sm" disabled={reel.state.images.length <= 1} onClick={reel.prev}>
            <ArrowLeft size={20} />
          </Button>

          <Button size="sm" onClick={generate}>
            Generate
          </Button>

          <Button size="sm" disabled={reel.state.images.length <= 1} onClick={reel.next}>
            <ArrowRight size={20} />
          </Button>
        </section>
      </div>
    </RootModal>
  )
}

function useImageContext() {
  const [store, setStore] = createStore(init())

  return [store, { update: setStore, reset: () => setStore(init()) }] as const
}

const init = (): ImageSamplers & { prompt: string; negative: string; type: ImageHost } => {
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
