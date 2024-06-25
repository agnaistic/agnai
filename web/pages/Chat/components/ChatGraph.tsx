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

    const cy = cyto({
      container: cyRef,
      layout: { name: 'dagre', rankDir: props.dir || 'LR' } as any,

      style: [
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

      panningEnabled: true,
      wheelSensitivity: 0.1,
      elements: getElements(props.tree, props.leafId),
    })

    cy.on('click', 'node', function (this: any, evt) {
      const id = this.id()
      msgStore.fork(id)
    })

    cy.on('tap', 'node', function (this: any, evt) {
      const id = this.id()
      msgStore.fork(id)
    })

    const win: any = window
    win.cy = cy
    cy.reset()
    cy.fit()
    cy.center()

    setGraph(cy)
    return cy
  }

  createEffect(
    on(
      () => props.tree,
      (tree) => {
        const cy = graph()
        if (!cy) return

        redraw(tree)
      }
    )
  )

  createEffect(
    on(
      () => props.leafId,
      (leafId) => {
        const cy = graph()
        if (!cy) return

        const nodes = cy.nodes()

        nodes.each((ele) => {
          const color = ele.id() === leafId ? 'hl-500' : 'bg-500'
          ele.style({ 'background-color': getSettingColor(color) })
        })
      }
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

function getElements(tree: ChatTree, leafId: string) {
  const elements: cyto.ElementDefinition[] = []

  for (const node of Object.values(tree)) {
    elements.push({
      group: 'nodes',
      data: { id: node.msg._id, label: node.msg._id.slice(0, 3) },
      style: {
        'background-color':
          leafId === node.msg._id ? getSettingColor('hl-500') : getSettingColor('bg-500'),
      },
    })
  }

  for (const node of Object.values(tree)) {
    if (node.children.size === 0) continue

    for (const child of Array.from(node.children.values())) {
      elements.push({
        group: 'edges',
        data: { source: node.msg._id, target: child },
      })
    }
  }

  return elements
}
