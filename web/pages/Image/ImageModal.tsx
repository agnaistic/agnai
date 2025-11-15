import './images.scss'
import { Component, For, JSX, Show, createEffect, createMemo, on } from 'solid-js'
import Modal from '../../shared/Modal'
import {
  ConfirmAction,
  hydrateMessageImages,
  ImageButton,
  imageStore,
  msgStore,
  pageStore,
  promptStore,
  toastStore,
} from '../../store'
import { getAssetUrl } from '../../shared/util'
import Button from '/web/shared/Button'
import { useImageCache } from '/web/shared/hooks'
import TextInput from '/web/shared/TextInput'
import { ArrowLeft, ArrowRight, Download, SettingsIcon, Trash, WandSparkles } from 'lucide-solid'
import { cleanPrompt } from '/common/util'
import { RelativeSpinner } from '/web/shared/Loading'
import { imageApi } from '/web/store/data/image'
import { getStore } from '/web/store/create'
import { createStore, SetStoreFunction } from 'solid-js/store'
import { ChatImageSettings, useCurrentChatImageSettings } from '../Settings/Image/ImageSettings'
import { Copy } from '/web/shared/Copy'
import { downloadImage } from '../Character/util'
import { debug } from '/common/debug'
import { genApi } from '/web/store/data/inference'
import { getImagePromptEntities } from '/web/store/data/common'

const log = debug('image-modal')

type ImageState = { prompt: string; promptLoading: boolean; loading: boolean }

export const ImageModal: Component = () => {
  const state = imageStore((s) => ({ showImage: s.showImage }))

  return (
    <>
      <ImageCollectionModal />

      <Show when={state.showImage?.src.type === 'url'}>
        <ImageUrlModal
          url={state.showImage?.src.type === 'url' ? state.showImage?.src.id! : ''}
          close={() => imageStore.clearImage()}
          actions={state.showImage?.options!}
          onClose={state.showImage?.onClose}
        />
      </Show>
    </>
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

const ImageCollectionModal: Component<{}> = (props) => {
  // const [ctx] = useImageContext()
  const reel = useImageCache()
  const store = imageStore((s) => {
    return {
      src: s.showImage?.src,
      options: s.showImage?.options,
      onClose: s.showImage?.onClose,
      preview: s.preview,
    }
  })

  const show = createMemo(() => {
    const next = store.src?.id !== undefined && store.src.type !== 'url'
    return next
  })

  const imageSettings = useCurrentChatImageSettings()

  const [state, update] = createStore<ImageState>({
    loading: false,
    prompt: '',
    promptLoading: false,
  })

  const title = createMemo(() => {
    if (reel.state.images.length) {
      return `Image: ${reel.state.pos + 1}/${reel.state.images.length}`
    }

    return 'Image: 0/0'
  })

  const attachImage = () => {
    const chatId = imageSettings().chatId

    const btns: ConfirmAction[] = []

    if (chatId) {
      btns.push({
        text: 'To Unsent',
        schema: 'primary',
        onClick: () => msgStore.addAttachment(chatId, [{ type: 'image', image: reel.state.image }]),
      })
    }

    if (store.src?.messageId) {
      btns.push({
        text: 'To Current',
        schema: 'primary',
        onClick: () =>
          msgStore.addAttachment(store.src?.messageId!, [
            { type: 'image', image: reel.state.image },
          ]),
      })
    }

    pageStore.openConfirm({ message: 'Add Message Attachment', actions: btns })
  }

  createEffect(
    on(
      () => store.src?.id,
      (id) => {
        log('loading #%s %s ', store.src?.initial || 0, id)
        if (id) {
          reel.load(id, store.src?.initial)
        }
        if (store.src?.type === 'message') {
          const msg = getGraphMessage(store.src.messageId)
          update('prompt', msg?.imagePrompt || '')
          return
        }
        update('prompt', store.src?.prompt || '')
      }
    )
  )

  const close = () => {
    store.onClose?.()
    imageStore.clearImage()
  }

  const removeImage = async () => {
    await reel.removeImage(reel.state.imageId)

    if (store.src?.messageId) {
      hydrateMessageImages(store.src.messageId)
    }
  }

  const generateImage = async () => {
    if (state.loading) return

    const imagePrompt = state.prompt

    update('loading', true)

    try {
      const result = await imageApi.generateImageAsync(imagePrompt, {
        model: '',
        noAffix: false,
      })

      const { cacheId } = await reel.addImage(result.image, {
        id: result.file.name,
        prompt: imagePrompt,
      })

      const msg = getGraphMessage(store.src?.messageId)
      if (!msg) return
      const nextExtras = msg.extras?.slice() || []
      msgStore.localEditMessageProp(msg._id, { extras: nextExtras.concat(cacheId) })
    } catch (ex: any) {
      toastStore.error(`Image Generation Error: ${ex.message || ex}`)
      console.error(ex)
      update('loading', false)
    } finally {
      update('loading', false)
    }
  }

  const ImageNavigate = (
    <div class="flex items-center justify-center gap-2">
      <Button size="sm" disabled={reel.state.images.length <= 1} onClick={reel.prev}>
        <ArrowLeft size={20} />
      </Button>

      <Button
        size="sm"
        schema="primary"
        disabled={!reel.state.image}
        onClick={() => downloadImage({ name: reel.state.imageId, image: reel.state.image })}
      >
        <Download size={20} />
      </Button>

      <Show when={store.src?.messageId}>
        <Button
          size="sm"
          schema="primary"
          disabled={!reel.state.image || !store.src?.messageId}
          onClick={attachImage}
        >
          Attach to Message
        </Button>
      </Show>

      <Button size="sm" schema="error" onClick={removeImage} disabled={!reel.state.images.length}>
        <Trash size={20} />
      </Button>

      <Button size="sm" disabled={reel.state.images.length <= 1} onClick={reel.next}>
        <ArrowRight size={20} />
      </Button>
    </div>
  )

  const GenerationActions = (
    <div class="flex flex-col gap-2">
      <div class="flex w-full items-end justify-end gap-2">
        <Button size="sm" onClick={generateImage} disabled={state.loading}>
          Generate Image
        </Button>

        <For each={store?.options || []}>
          {(action) => (
            <Button
              size="sm"
              schema={action.schema}
              onClick={() => action.onClick({ prompt: state.prompt, reel })}
            >
              {action.text}
            </Button>
          )}
        </For>
      </div>

      <div class="flex w-full justify-center">
        <Show when={store.preview}>
          <img src={store.preview?.base64} />
        </Show>
      </div>
    </div>
  )

  return (
    <Modal
      debug="img-col"
      show={show()}
      close={close}
      maxWidth="full"
      fixedHeight
      title={
        <div class="flex items-center gap-2">
          <div class="icon-button" onClick={() => getStore('image').imageSettings(true)}>
            <SettingsIcon size={20} />
          </div>
          <div>{title()}</div>
        </div>
      }
    >
      <PromptSettings
        state={state}
        update={update}
        messageId={store.src?.messageId}
        actions={GenerationActions}
        footer={ImageNavigate}
        settings={imageSettings()}
      >
        <section class="relative flex max-h-[calc(100%-200px)] justify-center">
          <Show when={state.loading}>
            <div class="bg-900 absolute right-1/2 top-1/2 rounded-lg p-2">
              <RelativeSpinner />
            </div>
          </Show>
          <Show when={!!reel.state.image}>
            <img class="min-h-0 rounded-sm object-contain" src={reel.state.image} />
          </Show>
        </section>
      </PromptSettings>
    </Modal>
  )
}

const PromptSettings: Component<{
  state: ImageState
  update: SetStoreFunction<ImageState>
  settings?: ChatImageSettings
  messageId: string | undefined
  children: JSX.Element
  actions: JSX.Element
  footer: JSX.Element
}> = (props) => {
  const persist = promptStore((s) => ({ imageHint: s.imageHint }))
  const msgs = msgStore((s) => ({ message: s.graph.tree[props.messageId || ''] }))

  const gen = genApi.inferenceSignal({
    onTick: (res, state) => {
      if (state === 'partial') props.update('prompt', res)
      if (state === 'done' || state === 'error') props.update('promptLoading', false)
    },
  })

  const fullImagePrompt = createMemo(() => {
    const parts = [props.settings?.prefix, props.state.prompt, props.settings?.suffix]
      .filter((c) => !!c?.trim())
      .join(', ')
    const cleaned = cleanPrompt(parts)
    return cleaned
  })

  const generatePrompt = async () => {
    if (gen.state.status === 'loading') {
      gen.cancel()
      return
    }

    const ents = await getImagePromptEntities(props.messageId)

    const template = imageApi.getSummaryTemplate({
      preset: ents.preset,
      summaryPrompt: ents.summary,
      question: persist.imageHint,
    })

    await gen.send({ prompt: template, preset: ents.preset })
  }

  const onCleanPrompt = () => {
    const cleaned = cleanPrompt(props.state.prompt)
    props.update('prompt', cleaned)
  }

  const saveMessagePrompt = () => {
    if (!props.messageId) return
    msgStore.editMessageProp(props.messageId, { imagePrompt: props.state.prompt })
  }

  const canSave = createMemo(() => {
    if (!props.messageId) return false
    if (!msgs.message) return false

    if (msgs.message.msg.imagePrompt === fullImagePrompt()) return false
    return true
  })

  return (
    <div class="image-modal">
      <section class="flex flex-col gap-1" style={{ 'grid-area': 'options' }}>
        <Show when={props.messageId}>
          <TextInput
            placeholder="Caption Hint: What to focus on when generating the caption?"
            class="!text-sm"
            onChange={(ev) =>
              promptStore.imageHint({
                chatId: msgs.message.msg.chatId,
                text: ev.currentTarget.value,
              })
            }
            value={persist.imageHint}
          />
        </Show>

        <TextInput
          parentClass="w-full !h-[80px]"
          class="!h-[80px] !max-h-[80px] !py-1 !text-sm"
          prelabel="Prompt"
          value={props.state.prompt}
          onChange={(ev) => props.update('prompt', ev.currentTarget.value)}
          isMultiline
          textarea={{ rows: 3 }}
        />

        <div class="flex w-full items-center justify-between">
          <Copy text={fullImagePrompt()}>
            <span class="text-sm">Copy</span>
          </Copy>

          <div class="flex-end flex gap-2">
            <Show when={props.messageId}>
              <Button size="sm" onClick={generatePrompt}>
                <Show
                  when={gen.state.status !== 'loading'}
                  fallback={
                    <>
                      <RelativeSpinner size={20} />
                      Stop
                    </>
                  }
                >
                  <WandSparkles size={16} /> Prompt
                </Show>
              </Button>
              <Button size="sm" onClick={onCleanPrompt}>
                Fix
              </Button>

              <Show when={props.messageId}>
                <Button size="sm" onClick={saveMessagePrompt} disabled={!canSave()}>
                  Save
                </Button>
              </Show>
            </Show>
          </div>
        </div>

        {props.actions}
      </section>

      <section class="image-modal-body" style={{ 'grid-area': 'content' }}>
        {props.children}
      </section>

      <section class="flex justify-center gap-2" style={{ 'grid-area': 'footer' }}>
        {props.footer}
      </section>
    </div>
  )
}

function getGraphMessage(id: string | undefined) {
  if (!id) return
  const { graph } = msgStore.getState()
  const msg = graph.tree[id]
  return msg?.msg
}
