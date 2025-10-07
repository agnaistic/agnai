import { Component, createEffect, createMemo, createSignal, For, onCleanup, Show } from 'solid-js'
import { imageStore, msgStore, toastStore } from '../../../store'
import Button from '/web/shared/Button'
import { useAppContext } from '/web/store/context'
import TextInput from '/web/shared/TextInput'
import { Card } from '/web/shared/Card'
import { LogProbs } from './LogProbs'
import Modal from '/web/shared/Modal'
import { cleanPrompt } from '/common/util'
import { AppSchema } from '/common/types'
import { SquareArrowOutUpRight } from 'lucide-solid'

export const MessageMeta: Component = () => {
  const [ctx] = useAppContext()
  const state = msgStore((s) => ({ msg: s.metadata, graph: s.graph }))

  const close = () => {
    msgStore.setState({ metadata: undefined })
  }

  const descendants = createMemo(() => {
    if (!state.msg) return []
    const self = state.graph.tree[state.msg._id]
    if (!self) return []

    return Array.from(self.children.values())
  })

  const depth = createMemo(() => {
    if (!state.msg) return -1
    return state.graph.tree[state.msg._id]?.depth || -1
  })

  return (
    <Modal show={!!state.msg} close={close} title="Message Info" maxWidth="half">
      <div class="flex w-full flex-col gap-2">
        <Card>
          <LogProbs msg={state.msg!} />
          <table class="text-sm">
            <Show when={state.msg!.adapter}>
              <tr>
                <td class="pr-2">
                  <b>Adapter</b>
                </td>
                <td>{state.msg!.adapter}</td>
              </tr>
            </Show>
            <Show when={depth() >= 0}>
              <tr>
                <td>
                  <b>depth</b>
                </td>
                <td>#{depth() + 1}</td>
              </tr>
            </Show>
            <Show when={descendants().length > 0 && ctx.flags.debug}>
              <tr>
                <td>
                  <b>descendants</b>
                </td>
                <td>
                  {descendants()
                    .map((d) => d.slice(0, 4))
                    .join(', ')}
                </td>
              </tr>
            </Show>
            <For each={Object.entries(state.msg!.meta || {}).filter(([key]) => key !== 'probs')}>
              {([key, value]) => (
                <tr>
                  <td class="pr-2">
                    <b>{key}</b>
                  </td>
                  <td>{value as string}</td>
                </tr>
              )}
            </For>
          </table>
        </Card>

        <Card>
          <MessageImagePrompt msg={state.msg!} close={close} />
        </Card>

        <Show when={ctx.promptHistory[state.msg!._id]}>
          <pre class="overflow-x-auto whitespace-pre-wrap break-words rounded-sm bg-[var(--bg-700)] p-1 text-sm">
            <Show
              when={typeof ctx.promptHistory[state.msg!._id] === 'string'}
              fallback={JSON.stringify(ctx.promptHistory[state.msg!._id], null, 2)}
            >
              {ctx.promptHistory[state.msg!._id]}
            </Show>
          </pre>
        </Show>
      </div>
    </Modal>
  )
}

export const MessageImagePrompt: Component<{
  msg: AppSchema.ChatMessage
  close: () => void
  children?: any
  onPrompt?: (prompt: string) => void
  onClose?: () => void
}> = (props) => {
  const [ctx] = useAppContext()

  const [prompt, setPrompt] = createSignal(props.msg?.imagePrompt || '')

  createEffect(() => {
    const p = prompt()
    props.onPrompt?.(p)
  })

  onCleanup(() => {
    props.onClose?.()
  })

  const updateImagePrompt = () => {
    if (!props.msg) return
    msgStore.editMessageProp(props.msg?._id, { imagePrompt: prompt() }, () => {
      toastStore.success('Image prompt updated')
    })
  }

  const generatePrompt = () => {
    if (ctx.waiting?.signal) {
      ctx.waiting.signal.abort()
      return
    }

    if (ctx.waiting) return

    msgStore.generateImagePrompt({
      onSummary: (summary) => setPrompt(summary),
      onTick: (res, state) => (state === 'partial' ? setPrompt(res) : null),
    })
  }

  return (
    <TextInput
      class="max-h-[160px]"
      helperText={
        <div class="mb-0.5 flex items-center gap-1.5">
          Image Prompt -{' '}
          <Button
            size="pill"
            schema="secondary"
            onClick={updateImagePrompt}
            disabled={prompt() === props.msg.imagePrompt}
          >
            Save
          </Button>
          <Button
            size="pill"
            schema="secondary"
            onClick={generatePrompt}
            disabled={ctx.waiting && !ctx.waiting.signal}
          >
            <Show when={ctx.waiting} fallback="Generate">
              Interrupt
            </Show>
          </Button>
          <Button
            size="pill"
            schema="secondary"
            onClick={() => {
              setPrompt(cleanPrompt(prompt()))
            }}
          >
            Clean
          </Button>
          <div
            class="icon-button"
            onClick={() => {
              imageStore.showMessageImages({ id: props.msg._id, position: 0 })
              props.close()
            }}
          >
            <SquareArrowOutUpRight size={20} />
          </div>
          {props.children}
        </div>
      }
      parentClass="text-sm"
      isMultiline
      value={prompt()}
      onChange={(ev) => setPrompt(ev.currentTarget.value)}
    />
  )
}
