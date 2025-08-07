import { Component, For, Match, Show, Switch, createEffect, createMemo, on } from 'solid-js'
import Modal from '../../shared/Modal'
import {
  ConfirmAction,
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
import {
  ArrowLeft,
  ArrowRight,
  BrushCleaning,
  Save,
  SettingsIcon,
  WandSparkles,
} from 'lucide-solid'
import { cleanPrompt } from '/common/util'
import { RelativeSpinner } from '/web/shared/Loading'
import { imageApi } from '/web/store/data/image'
import { getStore } from '/web/store/create'
import { createStore } from 'solid-js/store'
import { useCurrentChatImageSettings } from '../Settings/Image/ImageSettings'
import { Copy } from '/web/shared/Copy'
import { downloadImage } from '../Character/util'

export const ImageModal: Component = () => {
  const state = settingStore()

  return (
    <Switch>
      <Match when={!state.showImage?.src.type}>{null}</Match>

      <Match when={state.showImage?.src.type !== 'url'}>
        <ImageCollectionModal
          type={state.showImage?.src.type!}
          collection={state.showImage?.src.id!}
          close={() => settingStore.clearImage()}
          actions={state.showImage?.options!}
          initial={state.showImage?.src.initial}
          onClose={state.showImage?.onClose}
          prompt={state.showImage?.src.prompt}
          messageId={state.showImage?.src.messageId}
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
  type: ImageSource['type']
  collection: string
  messageId?: string
  initial?: number
  close: () => void
  prompt?: string
  actions: ImageButton[]
  onClose?: () => void
}> = (props) => {
  const reel = useImageCache(props.collection, { initial: props.initial })
  const imageSettings = useCurrentChatImageSettings()

  const persist = promptStore()
  const [state, update] = createStore({
    loading: false,
    prompt: '',
    promptLoading: false,
  })

  const saveMessagePrompt = () => {
    if (!props.messageId) return
    msgStore.editMessageProp(props.messageId, { imagePrompt: state.prompt })
  }

  const title = createMemo(() => {
    if (reel.state.images.length) {
      return `Image: ${reel.state.pos + 1}/${reel.state.images.length}`
    }

    return 'Image: 0/0'
  })

  const fullImagePrompt = createMemo(() => {
    const cfg = imageSettings()
    const parts = [cfg?.prefix, state.prompt, cfg?.suffix].filter((c) => !!c?.trim()).join(', ')
    const cleaned = cleanPrompt(parts)

    return cleaned
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
        if (!id) return
        reel.load(id, props.initial)
      }
    )
  )

  createEffect(
    on(
      () => props.collection,
      () => {
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

  const onCleanPrompt = () => {
    const cleaned = cleanPrompt(state.prompt)
    update('prompt', cleaned)
  }

  const removeImage = async () => {
    await reel.removeImage(reel.state.imageId)
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

  const generatePrompt = () => {
    update('promptLoading', true)
    getStore('messages').generateImagePrompt({
      question: persist.imageHint,
      onSummary: (summary) => {
        update({ prompt: summary, promptLoading: false })
      },
      onTick: (res, state) => {
        if (state === 'partial') update('prompt', res)
        if (state === 'done' || state === 'error') update('promptLoading', false)
      },
    })
  }

  return (
    <Modal
      show={!!props.collection}
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
      footer={
        <div class="flex h-full w-full items-end justify-center gap-2">
          <Button size="sm" disabled={reel.state.images.length <= 1} onClick={reel.prev}>
            <ArrowLeft size={20} />
          </Button>

          <Button size="sm" onClick={generateImage} disabled={state.loading}>
            Generate
          </Button>

          <Button
            size="sm"
            schema="error"
            onClick={removeImage}
            disabled={!reel.state.images.length}
          >
            Delete
          </Button>

          <Button
            size="sm"
            schema="primary"
            disabled={!reel.state.image}
            onClick={() => downloadImage({ name: reel.state.imageId, image: reel.state.image })}
          >
            Download
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
      }
    >
      <div class="flex h-full w-full flex-col gap-1">
        <section class="w-full">
          <div class="flex w-full flex-col justify-center gap-1">
            <TextInput
              placeholder={'(Optional) What to focus on?'}
              value={persist.imageHint}
              onChange={(ev) => promptStore.imageHint(ev.currentTarget.value)}
            />
            <TextInput
              parentClass="w-full !h-[64px]"
              class="!h-[64px] !max-h-[64px] !py-1 !text-sm"
              prelabel="Prompt"
              value={state.prompt}
              onChange={(ev) => update('prompt', ev.currentTarget.value)}
              isMultiline
              textarea={{ rows: 2 }}
            />

            <div class="flex w-full items-center justify-end gap-2">
              <Copy text={fullImagePrompt()} />

              <Button onClick={generatePrompt} disabled={state.promptLoading}>
                <Show when={!state.promptLoading} fallback={<RelativeSpinner size={20} />}>
                  <WandSparkles size={20} />
                </Show>
              </Button>

              <Button onClick={onCleanPrompt}>
                <BrushCleaning size={20} />
              </Button>

              <Show when={props.messageId}>
                <Button onClick={saveMessagePrompt}>
                  <Save size={20} />
                </Button>
              </Show>
            </div>
          </div>
        </section>

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
      </div>
    </Modal>
  )
}

function getGraphMessage(id: string | undefined) {
  if (!id) return
  const { graph } = msgStore.getState()
  const msg = graph.tree[id]
  return msg?.msg
}
