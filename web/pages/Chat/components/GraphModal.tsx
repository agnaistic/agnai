import { Component, lazy } from 'solid-js'
import { ChatTree } from '/common/chat'
import Modal from '/web/shared/Modal'

export const ChatGraphModal: Component<{
  tree: ChatTree
  leafId: string
  show: boolean
  close: () => void
}> = (props) => {
  const Graph = lazy(() => import('./ChatGraph'))

  return (
    <Modal show={props.show} close={props.close} maxWidth="full" title="Chat Graph">
      <div>Click on a node to load the path</div>
      <Graph tree={props.tree} leafId={props.leafId} />
    </Modal>
  )
}
