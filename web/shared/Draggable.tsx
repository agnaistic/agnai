import { Component } from 'solid-js'
import { createDraggable, createDroppable } from '@thisbeyond/solid-dnd'

export const Draggable: Component<{ id: string; children: any }> = (props) => {
  const draggable = createDraggable(props.id)
  return <div ref={(ref) => draggable(ref)}>{props.children}</div>
}

export const Droppable: Component<{ id: string; children: any }> = (props) => {
  const droppable = createDroppable(props.id)
  return <div ref={(ref) => droppable(ref)}>{props.children}</div>
}
