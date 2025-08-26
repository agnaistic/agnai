import './images.scss'
import { Component, For, Show, createEffect, createMemo, on } from 'solid-js'
import Modal from '../../shared/Modal'
import {
  ConfirmAction,
  hydrateMessageImages,
  ImageButton,
  ImageSource,
  msgStore,
  promptStore,
  settingStore,
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
import { useCurrentChatImageSettings } from '../Settings/Image/ImageSettings'
import { Copy } from '/web/shared/Copy'
import { downloadImage } from '../Character/util'
import { ImageContext, useImageContext } from '../Settings/Image/image-context'

type ImageState = { prompt: string; promptLoading: boolean; loading: boolean }

export const ImageModal: Component = () => {
  const state = settingStore()
  const [ctx] = useImageContext()

  return (
    <>
      <ImageCollectionModal
        ctx={ctx}
        type={state.showImage?.src.type!}
        collection={
          state.showImage?.src.type === 'collection' || state.showImage?.src.type === 'message'
            ? state.showImage?.src.id!
            : undefined
        }
        close={() => settingStore.clearImage()}
        actions={state.showImage?.options!}
        initial={state.showImage?.src.initial}
        onClose={state.showImage?.onClose}
        prompt={state.showImage?.src.prompt}
        messageId={state.showImage?.src.messageId}
      />

      <Show when={state.showImage?.src.type === 'url'}>
        <ImageUrlModal
          url={state.showImage?.src.type === 'url' ? state.showImage?.src.id! : ''}
          close={() => settingStore.clearImage()}
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

const ImageCollectionModal: Component<{
  type: ImageSource['type']
  ctx: ImageContext
  collection: string | undefined
  messageId?: string
  initial?: number
  close: () => void
  prompt?: string
  actions: ImageButton[]
  onClose?: () => void
}> = (props) => {
  const reel = useImageCache(props.collection || 'ephemeral-collection', {
    initial: props.initial,
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

    if (props.messageId) {
      btns.push({
        text: 'To Current',
        schema: 'primary',
        onClick: () =>
          msgStore.addAttachment(props.messageId!, [{ type: 'image', image: reel.state.image }]),
      })
    }

    settingStore.openConfirm({ message: 'Add Message Attachment', actions: btns })
  }

  createEffect(
    on(
      () => props.collection,
      (id) => {
        if (id) {
          reel.load(id, props.initial)
        }
        if (props.type === 'message') {
          const msg = getGraphMessage(props.messageId)
          update('prompt', msg?.imagePrompt || '')
          return
        }
        update('prompt', props.prompt || '')
      }
    )
  )

  const close = () => {
    props.onClose?.()
    props.close()
  }

  const removeImage = async () => {
    await reel.removeImage(reel.state.imageId)

    if (props.messageId) {
      hydrateMessageImages(props.messageId)
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

      const msg = getGraphMessage(props.messageId)
      if (!msg) return
      const nextExtras = msg.extras?.slice() || []
      msgStore.localEditMessageProp(msg._id, { extras: nextExtras.concat(cacheId) })
    } finally {
      update('loading', false)
    }
  }

  const ImageFooter = (
    <div class="flex h-full w-full items-end justify-center gap-2">
      <Button size="sm" disabled={reel.state.images.length <= 1} onClick={reel.prev}>
        <ArrowLeft size={20} />
      </Button>

      <Button size="sm" onClick={generateImage} disabled={state.loading}>
        Generate
      </Button>

      <Button size="sm" schema="error" onClick={removeImage} disabled={!reel.state.images.length}>
        <Trash size={20} />
      </Button>

      <Button
        size="sm"
        schema="primary"
        disabled={!reel.state.image}
        onClick={() => downloadImage({ name: reel.state.imageId, image: reel.state.image })}
      >
        <Download size={20} />
      </Button>

      <Button
        size="sm"
        schema="primary"
        disabled={!reel.state.image || !props.messageId}
        onClick={attachImage}
      >
        Attach
      </Button>

      <For each={props.actions}>
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

      <Button size="sm" disabled={reel.state.images.length <= 1} onClick={reel.next}>
        <ArrowRight size={20} />
      </Button>
    </div>
  )

  return (
    <Modal
      show={props.collection !== undefined}
      close={close}
      maxWidth="full"
      fixedHeight
      title={
        <div class="flex items-center gap-2">
          <div class="icon-button" onClick={() => getStore('settings').imageSettings(true)}>
            <SettingsIcon size={20} />
          </div>
          <div>{title()}</div>
        </div>
      }
    >
      <PromptSettings
        ctx={props.ctx}
        state={state}
        update={update}
        messageId={props.messageId}
        footer={ImageFooter}
      >
        <section class="flex max-h-[calc(100%-100px)] justify-center">
          <Show when={state.loading}>
            <div class="bg-900 absolute right-1/2 top-1/2 rounded-lg p-2">
              <RelativeSpinner />
            </div>
          </Show>
          <Show when={!!reel.state.image}>
            <img class="min-h-0 object-contain" src={reel.state.image} />
          </Show>
        </section>
      </PromptSettings>
    </Modal>
  )
}

const PromptSettings: Component<{
  ctx: ImageContext
  state: ImageState
  update: SetStoreFunction<ImageState>
  messageId: string | undefined
  children: any
  footer: any
}> = (props) => {
  const persist = promptStore()

  const fullImagePrompt = createMemo(() => {
    const cfg = props.ctx.cfg()
    const parts = [cfg?.prefix, props.state.prompt, cfg?.suffix]
      .filter((c) => !!c?.trim())
      .join(', ')
    const cleaned = cleanPrompt(parts)

    return cleaned
  })

  const generatePrompt = () => {
    props.update('promptLoading', true)
    getStore('messages').generateImagePrompt({
      question: persist.imageHint,
      onSummary: (summary) => {
        props.update({ prompt: summary, promptLoading: false })
      },
      onTick: (res, state) => {
        if (state === 'partial') props.update('prompt', res)
        if (state === 'done' || state === 'error') props.update('promptLoading', false)
      },
    })
  }

  const onCleanPrompt = () => {
    const cleaned = cleanPrompt(props.state.prompt)
    props.update('prompt', cleaned)
  }

  const saveMessagePrompt = () => {
    if (!props.messageId) return
    msgStore.editMessageProp(props.messageId, { imagePrompt: props.state.prompt })
  }

  return (
    <div class="image-modal">
      <section class="flex flex-col gap-1" style={{ 'grid-area': 'options' }}>
        <Show when={props.messageId}>
          <TextInput
            placeholder="Prompt Gen Hint: What to focus on?"
            class="!text-sm"
            onChange={(ev) => promptStore.imageHint(ev.currentTarget.value)}
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
              <Button size="sm" onClick={generatePrompt} disabled={props.state.promptLoading}>
                <Show when={!props.state.promptLoading} fallback={<RelativeSpinner size={20} />}>
                  <WandSparkles size={16} /> Prompt
                </Show>
              </Button>
              <Button size="sm" onClick={onCleanPrompt}>
                Fix
              </Button>

              <Show when={props.messageId}>
                <Button size="sm" onClick={saveMessagePrompt}>
                  Save
                </Button>
              </Show>
            </Show>
          </div>
        </div>
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
