import type Cyto from 'cytoscape'
import { Component, lazy } from 'solid-js'
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
      title="Chat Graph"
      footer={
        <>
          <Button onClick={reset}>Reset View</Button>
          <Button onClick={toggle}>Rotate</Button>
          <Button onClick={props.close}>Close</Button>
        </>
      }
    >
      <div>Click on a node to load the path. Click and drag to move the graph.</div>
      <Graph tree={props.tree} leafId={props.leafId} dir={dir()} />
    </Modal>
  )
}
