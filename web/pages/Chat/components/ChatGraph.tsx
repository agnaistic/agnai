import cyto from 'cytoscape'
import dagre from 'cytoscape-dagre'
import { Component, createEffect, createSignal, on, onCleanup } from 'solid-js'
import { ChatTree } from '/common/chat'
import { msgStore } from '/web/store'
import { getSettingColor } from '/web/shared/colors'

export { ChatGraph as default }

cyto.use(dagre)

export const ChatGraph: Component<{ tree: ChatTree; leafId: string; dir?: string }> = (props) => {
  let cyRef: any

  const [graph, setGraph] = createSignal<cyto.Core>()

  const init = (ref: HTMLDivElement, tree: ChatTree) => {
    cyRef = ref
    redraw(tree)
  }

  const redraw = (tree: ChatTree) => {
    graph()?.destroy()

    const nodes = Object.values(tree).map((node) => {
      return {
        data: {
          id: node.msg._id,
          label: props.leafId === node.msg._id ? '***' : node.msg._id.slice(0, 3),
        },
      }
    })

    const edges = Object.values(tree)
      .filter((node) => node.children.size !== 0)
      .map((node) => {
        return Array.from(node.children.values()).map((child) => ({
          data: { source: node.msg._id, target: child },
        }))
      })
      .flat()

    const cy = cyto({
      container: cyRef,
      layout: { name: 'dagre', rankDir: props.dir || 'LR' } as any,

      style: [
        {
          selector: 'node',
          style: {
            'background-color': getSettingColor('hl-500'),
          },
        },

        {
          selector: 'edge',
          style: {
            width: 4,
            'target-arrow-shape': 'triangle',
            'line-color': '#fff',
            'target-arrow-color': '#fff',
            'curve-style': 'bezier',
          },
        },
        {
          selector: 'node[label]',
          style: {
            color: getSettingColor('bg-500'),
            'text-valign': 'bottom',
            label: 'data(label)',
          },
        },
      ],

      elements: {
        nodes,
        edges,
      },
      panningEnabled: true,
      wheelSensitivity: 0.1,
    })

    cy.on('click', 'node', function (this: any, evt) {
      const id = this.id()
      msgStore.fork(id)
    })

    const win: any = window
    win.cy = cy
    cy.fit()
    cy.center()

    setGraph(cy)
    return cy
  }

  createEffect(
    on(
      () => props.tree,
      (tree) => redraw(tree)
    )
  )

  createEffect(
    on(
      () => props.leafId,
      (leafIf) => redraw(props.tree)
    )
  )

  createEffect(
    on(
      () => props.dir,
      (dir) => {
        const result = graph()?.layout({ name: 'dagre', rankDir: dir || 'LR' } as any)
        result?.run()
        graph()?.fit()
      }
    )
  )

  onCleanup(() => {
    graph()?.destroy()
  })

  return (
    <div
      class="flex h-full max-h-[400px] min-h-[400px] w-full justify-center p-4"
      ref={(ref) => init(ref, props.tree)}
    >
      {/* <div class="left-0 top-0 z-50 h-full w-full" ref={(ref) => init(ref, props.tree)}></div> */}
    </div>
  )
}
