import type Cyto from 'cytoscape'
import { Component, Show, lazy } from 'solid-js'
import { ChatTree } from '/common/chat'
import Modal from '/web/shared/Modal'
import { useLocalStorage } from '/web/shared/hooks'
import Button from '/web/shared/Button'

export const ChatGraphModal: Component<{
  tree: ChatTree
  leafId: string
  show: boolean
  close: () => void
}> = (props) => {
  const Graph = lazy(() => import('./ChatGraph'))

  const cy = () => (window as any).cy as Cyto.Core | undefined

  const [dir, setDir] = useLocalStorage('graph-layout', 'LR')
  const [short, setShort] = useLocalStorage<'short' | 'full'>('graph-shorthand', 'short')

  const toggle = () => {
    const next = dir() === 'LR' ? 'TB' : 'LR'
    setDir(next)
  }

  const reset = () => {
    cy()?.reset()
    cy()?.fit()
  }

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
            <Show when={short() === 'short'} fallback={'Collapse Graph'}>
              Expand Graph
            </Show>
          </Button>
          <Button onClick={reset}>Reset View</Button>
          <Button onClick={toggle}>Rotate</Button>
          <Button onClick={props.close}>Close</Button>
        </>
      }
    >
      <div class="text-sm">
        Click a node to load the path. Click&Drag to move the graph. Pinch/Scroll to zoom.
      </div>
      <Graph leafId={props.leafId} dir={dir()} nodes={short()} />
    </Modal>
  )
}
