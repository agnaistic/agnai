import { Component, For, Setter, Show, createMemo, createSignal } from 'solid-js'
import { AppSchema } from '/common/types'
import { Pill } from '/web/shared/Card'
import { X } from 'lucide-solid'

type Prob = { t: string; p: [Record<string, number>] }
type Pair = { token: string; prob: number }

export const LogProbs: Component<{ msg: AppSchema.ChatMessage }> = (props) => {
  const [clicked, setClicked] = createSignal<Pair[]>([])
  const [curr, setCurr] = createSignal<Pair[]>([])
  const [index, setIndex] = createSignal(-1)

  const probs = createMemo(() => {
    const first = curr()
    const second = clicked()

    if (first.length) return first
    if (second.length) return second
    return []
  })
  return (
    <Show when={props.msg.meta?.probs}>
      <div class="mb-2 flex w-full flex-col gap-1">
        <b class="text-md">Token Probabilities</b>
        <div class="mb-2 text-sm">
          <For each={props.msg.meta.probs}>
            {(prob, i) => (
              <Prob
                prob={prob}
                select={setCurr}
                click={(pairs: Pair[]) => {
                  setIndex(i())
                  setClicked(pairs)
                }}
                selected={index() === i()}
              />
            )}
          </For>
        </div>

        <div class="min-h-16 flex h-16 flex-wrap gap-1">
          <Show when={probs().length}>
            <For each={probs()}>
              {(item) => {
                return (
                  <Pill small>
                    <pre>
                      {item.token}: {item.prob.toFixed(4)}
                    </pre>
                  </Pill>
                )
              }}
            </For>

            <Show when={clicked().length}>
              <Pill
                small
                type="rose"
                class="cursor-pointer"
                onClick={() => {
                  setClicked([])
                  setIndex(-1)
                }}
              >
                <X size={12} />
              </Pill>
            </Show>
          </Show>
        </div>
      </div>
    </Show>
  )
}

const Prob: Component<{
  prob: Prob
  select: Setter<Pair[]>
  click: (pairs: Pair[]) => void
  selected: boolean
}> = (props) => {
  return (
    <span
      class="cursor-pointer hover:bg-[var(--hl-600)]"
      onMouseEnter={() => props.select(toProbs(props.prob.p?.[0]))}
      onMouseLeave={() => props.select([])}
      onClick={() => props.click(toProbs(props.prob.p?.[0]))}
      classList={{ 'bg-[var(--hl-500)]': props.selected }}
    >
      {props.prob.t}
    </span>
  )
}

function toProbs(probs: Record<string, number>) {
  const list: Array<{ token: string; prob: number }> = []
  if (!probs) return list

  for (const [key, value] of Object.entries(probs)) {
    list.push({ token: key, prob: value })
  }

  list.sort((l, r) => r.prob - l.prob)
  return list
}
