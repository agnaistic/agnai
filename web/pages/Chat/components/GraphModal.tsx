import { Component, Show, createMemo, lazy, onMount } from 'solid-js'
import { ChatTree } from '/common/chat'
import Modal from '/web/shared/Modal'
import { useLocalStorage } from '/web/shared/hooks'
import Button, { MultiButton } from '/web/shared/Button'
import { createStore } from 'solid-js/store'
import type { GraphState } from './ChatGraph'
import { CharacterAvatar } from '/web/shared/AvatarIcon'
import { useAppContext } from '/web/store/context'
import { MessageShell } from './MessageShell'
import { createEmitter } from '/web/shared/util'
import { msgStore } from '/web/store'
import type cytoscape from 'cytoscape'
import { debug } from '/common/debug'
import { Pill } from '/web/shared/Card'
import { Split } from 'lucide-solid'

const log = debug('graph')

export const ChatGraphModal: Component<{
  tree: ChatTree
  leafId: string
  show: boolean
  close: () => void
}> = (props) => {
  const Graph = lazy(() => import('./ChatGraph'))

  const [ctx] = useAppContext()

  const emitter = createEmitter('reset', 'click', 'hover', 'unhover')
  const [dir, setDir] = useLocalStorage('graph-layout', 'LR')
  const [short, setShort] = useLocalStorage<'short' | 'full'>('graph-shorthand', 'short')

  const [store, setStore] = createStore<GraphState>({
    clicked: '',
    hovered: '',
    rejoin: '',
    parent: '',
  })

  const message = createMemo(() => {
    const hovered = store.hovered
    const clicked = store.clicked

    if (!hovered && !clicked) return
    const msg = ctx.chatTree[hovered || clicked]

    if (!msg?.msg) return
    return { ...msg.msg, children: msg.children, depth: msg.depth }
  })

  const toggle = () => {
    const next = dir() === 'LR' ? 'TB' : 'LR'
    setDir(next)
  }

  const reset = () => {
    emitter.emit.reset()
  }

  const canRejoin = createMemo(() => {
    if (!store.clicked) return false
    if (store.rejoin) return false

    const msg = ctx.chatTree[store.clicked]
    if (!msg) return false

    // The real root node can't be rejoined
    if (!msg.msg.parent) return false
    let curr = msg.msg.parent

    if (ctx.chatTree[msg.msg.parent]) return false

    do {
      // The target (re-joining node) can't be a descendant of itself (graph must remain acyclic)
      if (curr === store.rejoin) return false

      const parent = ctx.chatTree[curr]

      // Orphans can be joined to other orphans
      if (!parent) break
      if (!parent.msg.parent) break

      // Iterate, check the validity of this node
      curr = parent.msg.parent
      continue
    } while (true)

    return true
  })

  const assignParent = createMemo(() => {
    const rejoin = store.rejoin
    const parent = store.parent

    const state = !rejoin ? 'Re-join Node' : rejoin && parent ? 'Assign Parent' : 'Select Parent'
    const choose = state === 'Select Parent'

    const candidate =
      state !== 'Select Parent'
        ? '....'
        : !store.clicked
        ? '....'
        : store.clicked === store.rejoin
        ? '....'
        : store.clicked.slice(0, 4)

    const content =
      state === 'Re-join Node'
        ? state
        : state === 'Select Parent'
        ? `${state}: ${candidate}`
        : `${state}: ${store.parent.slice(0, 4)}`

    return { state, choose, content } as const
  })

  const onRejoinClick = async () => {
    const assign = assignParent()

    switch (assign.state) {
      case 'Re-join Node': {
        if (!canRejoin()) return
        setStore('rejoin', store.clicked)
        break
      }

      case 'Select Parent': {
        if (!store.clicked || !store.rejoin) return
        if (store.clicked === store.rejoin) return
        setStore('parent', store.clicked)
        break
      }

      case 'Assign Parent': {
        if (!store.rejoin || !store.parent) return

        await msgStore.editMessageParent(store.rejoin, { parent: store.parent })
        log(`rejoining: ${store.parent.slice(0, 4)} <-- ${store.rejoin.slice(0, 4)}`)
        emitter.emit.reset()
        break
      }
    }
  }

  onMount(() => {
    emitter.on('click', (id: string, node: cytoscape.NodeSingular) => {
      setStore('clicked', id)
    })

    emitter.on('hover', (id: string, node: cytoscape.NodeSingular) => {
      setStore('hovered', id)
    })

    emitter.on('unhover', () => {
      setStore('hovered', '')
    })
  })

  return (
    <Modal
      show={props.show}
      close={props.close}
      maxWidth="full"
      maxHeight
      title="Chat Graph"
      footer={
        <>
          <Button onClick={() => setShort(short() === 'full' ? 'short' : 'full')}>
            <Show when={short() === 'short'} fallback={'Collapse'}>
              Expand
            </Show>
          </Button>
          <Button onClick={reset}>Reset</Button>
          <Button onClick={toggle}>Rotate</Button>
          <Button onClick={props.close}>Close</Button>
        </>
      }
    >
      <div
        class="grid h-full w-full gap-1"
        style={{ 'grid-auto-rows': 'auto auto 40px 1fr', 'grid-template-columns': '1fr' }}
      >
        <div class="text-sm">
          <p>Click a node to load the path. Click&Drag to move the graph. Pinch/Scroll to zoom.</p>
          <p>To re-join an </p>
        </div>
        <div class="h-32 min-h-32 overflow-y-scroll">
          <Show when={message()}>
            <div class="max-h-32">
              <MessageShell
                author={ctx.allBots[message()!.characterId!]?.name}
                content={message()!.msg}
                dateline={new Date(message()!.createdAt!)}
                avatar={
                  <CharacterAvatar
                    char={ctx.allBots[message()!.characterId!]}
                    format={{ corners: 'circle', size: 'sm' }}
                  />
                }
              />
            </div>
          </Show>
        </div>

        <div class="flex gap-2">
          <Button disabled={!store.clicked} onClick={() => msgStore.fork(store.clicked)} size="sm">
            <Split size={12} /> Fork
          </Button>

          <Show when={canRejoin() || store.rejoin}>
            <MultiButton
              size="sm"
              buttons={[
                {
                  content: `${assignParent().content}`,
                  onClick: () => {
                    onRejoinClick()
                  },
                },
                {
                  content: 'Cancel',
                  disabled: !store.rejoin,
                  onClick: () => setStore('rejoin', ''),
                },
              ]}
            />
          </Show>

          <Show when={window.flags.debug}>
            <Pill small>ID: {message() ? message()?._id.slice(0, 4) : '....'}</Pill>
            <Pill small>P: {message() ? message()?.parent?.slice(0, 4) || 'none' : '....'}</Pill>
            <Pill small>
              C:{' '}
              {message()
                ? Object.keys(message()!.children)
                    .map((k) => k.slice(0, 4))
                    .join(', ')
                : '...'}
            </Pill>
          </Show>
        </div>

        <Graph
          leafId={props.leafId}
          dir={dir()}
          nodes={short()}
          state={store}
          setter={setStore}
          emit={emitter.emit}
          sub={emitter.on}
        />
      </div>
    </Modal>
  )
}
