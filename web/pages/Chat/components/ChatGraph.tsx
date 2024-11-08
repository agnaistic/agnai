import cyto from 'cytoscape'
import dagre from 'cytoscape-dagre'
import { Component, createEffect, createSignal, on, onCleanup } from 'solid-js'
import { ChatNode, ChatTree } from '/common/chat'
import { msgStore, settingStore } from '/web/store'
import { getSettingColor } from '/web/shared/colors'
import { FeatureFlags } from '/web/store/flags'
import { AppSchema } from '/common/types'
import { SetStoreFunction } from 'solid-js/store'
import { toShortDuration } from '/web/shared/util'

export { ChatGraph as default }

cyto.use(dagre)

export type GraphState = {
  hovered: string
  clicked: string
  msg?: AppSchema.ChatMessage
}

export const ChatGraph: Component<{
  leafId: string
  dir?: string
  nodes: 'short' | 'full'
  state: GraphState
  setter: SetStoreFunction<GraphState>
}> = (props) => {
  let cyRef: any

  const graph = msgStore((s) => s.graph)
  const flags = settingStore((s) => s.flags)

  createEffect(() => {
    const id = props.state.hovered || props.state.clicked
    if (!id) {
      props.setter({ msg: undefined })
      return
    }

    const msg = graph.tree[id]
    props.setter({ msg: msg?.msg })
  })

  const [instance, setInstance] = createSignal<cyto.Core>()
  const init = (ref: HTMLDivElement, tree: ChatTree) => {
    cyRef = ref
    redraw(tree)
  }

  const redraw = (tree: ChatTree) => {
    instance()?.destroy()

    const cy = cyto({
      container: cyRef,
      layout: { name: 'dagre', rankDir: props.dir || 'LR' } as any,

      style: [
        {
          selector: 'edge',
          style: {
            width: 2,
            'target-arrow-shape': 'triangle',
            'line-color': getSettingColor('bg-600'),
            'target-arrow-color': getSettingColor('bg-600'),
            'curve-style': 'bezier',
            'text-valign': 'bottom',
          },
        },
        {
          selector: 'edge[label]',
          style: {
            color: getSettingColor('hl-500'),
            label: 'data(label)',
            'text-valign': 'top',
            'font-weight': 600,
          },
        },

        {
          selector: 'node[label]',
          style: {
            color: getSettingColor('bg-400'),
            'text-valign': 'bottom',
            label: 'data(label)',
          },
        },
      ],

      panningEnabled: true,
      wheelSensitivity: 0.1,
      elements:
        props.nodes === 'full'
          ? getAllElements(graph.tree, props.leafId)
          : getElements(graph.tree, graph.root, props.leafId, flags),
    })

    cy.on('click', 'node', function (this: any, evt) {
      const id = this.id()
      props.setter('clicked', props.state.clicked === id ? '' : id)
      msgStore.fork(id)
    })

    cy.on('tap', 'node', function (this: any, evt) {
      const id = this.id()
      props.setter('clicked', props.state.clicked === id ? '' : id)
      msgStore.fork(id)
    })

    cy.on('mouseover', 'node', function (this: any, evt) {
      props.setter('hovered', this.id())
      document.body.style.cursor = 'pointer'
      this.style('border-color', getSettingColor('hl-200'))
      this.style('border-width', '1')
    })

    cy.on('mouseout', 'node', function (this: any) {
      document.body.style.cursor = ''
      this.style('border-width', '0')
    })

    const win: any = window
    win.cy = cy
    cy.reset()
    cy.fit()
    cy.center()

    setInstance(cy)
    return cy
  }

  createEffect(
    on(
      () => graph.tree,
      (tree) => {
        const win: any = window
        win.tree = { ...graph.tree }
        const cy = instance()
        if (!cy) return

        redraw(tree)
      }
    )
  )

  createEffect(
    on(
      () => props.nodes,
      () => {
        const cy = instance()
        if (!cy) return

        redraw(graph.tree)
      }
    )
  )

  createEffect(
    on(
      () => props.leafId,
      (leafId) => {
        const cy = instance()
        if (!cy) return

        const nodes = cy.nodes()

        nodes.each((ele) => {
          const color =
            ele.id() === leafId
              ? 'green-500'
              : graph.tree[ele.id()]?.msg.userId
              ? 'bg-500'
              : 'hl-500'

          ele.style({ 'background-color': getSettingColor(color) })
        })
      }
    )
  )

  createEffect(
    on(
      () => props.dir,
      (dir) => {
        const result = instance()?.layout({ name: 'dagre', rankDir: dir || 'LR' } as any)
        result?.run()
        instance()?.fit()
      }
    )
  )

  onCleanup(() => {
    instance()?.destroy()
  })

  return (
    <div
      class="flex h-full min-h-[400px] w-full justify-center p-4"
      ref={(ref) => init(ref, graph.tree)}
    ></div>
  )
}

function getElements(tree: ChatTree, root: string, leafId: string, flags: FeatureFlags) {
  const elements: cyto.ElementDefinition[] = []

  const short = getShorthandTree(tree, root, flags)
  const visited = new Set<string>()
  for (const {
    start: { msg: smsg },
    end: { msg: emsg },
    length,
  } of short) {
    if (flags.debug) {
      console.log(`${smsg._id.slice(0, 4)} --> ${emsg._id.slice(0, 4)}`)
    }

    if (!visited.has(smsg._id)) {
      visited.add(smsg._id)
      elements.push({
        group: 'nodes',
        data: { id: smsg._id, label: toLabel(smsg) },
        style: {
          shape: smsg._id === root ? 'star' : 'ellipse',
          'background-color':
            root === smsg._id || leafId === smsg._id
              ? getSettingColor('green-500')
              : !smsg.userId
              ? getSettingColor('hl-500')
              : getSettingColor('bg-500'),
        },
      })
    }

    if (!visited.has(emsg._id)) {
      visited.add(emsg._id)
      elements.push({
        group: 'nodes',
        data: { id: emsg._id, label: toLabel(emsg) },
        style: {
          'background-color':
            leafId === emsg._id
              ? getSettingColor('green-500')
              : !emsg.userId
              ? getSettingColor('hl-500')
              : getSettingColor('bg-500'),
        },
      })
    }

    elements.push({
      group: 'edges',
      data: { source: smsg._id, target: emsg._id, label: `${length}` },
    })
  }

  if (flags.debug) {
    console.log('\n########\n')
  }

  return elements
}

function getAllElements(tree: ChatTree, leafId: string) {
  const elements: cyto.ElementDefinition[] = []

  for (const node of Object.values(tree)) {
    elements.push({
      group: 'nodes',
      data: { id: node.msg._id, label: toLabel(node.msg) },
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

type PathSkip = { start: ChatNode; end: ChatNode; length: number }

function getShorthandTree(tree: ChatTree, root: string, flags: FeatureFlags) {
  if (flags.debug) {
    console.log('eval: ', root)
  }

  const skips = getPathSkips(tree, root, flags)
  return skips || []
}

function getPathSkips(tree: ChatTree, id: string, flags: FeatureFlags): PathSkip[] | undefined {
  const start = tree[id]

  const visited = new Set<string>([id])
  let curr = tree[id]
  if (!curr) return
  let length = 1

  do {
    if (curr.children.size === 0) {
      if (id === curr.msg._id) return
      return [{ start, end: curr, length }]
    }

    if (curr.children.size === 1) {
      const next = curr.children.values().next().value!
      if (visited.has(next)) {
        throw new Error(`Invalid chat tree: Contains a circular reference (${next})`)
      }

      length++
      visited.add(next)
      curr = tree[next]
      continue
    }

    const edges: PathSkip[] = []

    if (start.msg._id !== curr.msg._id) {
      edges.push({ start, end: curr, length })
    }
    for (const child of curr.children) {
      const end = tree[child]
      if (!end) continue

      edges.push({ start: curr, end, length: 1 })

      const inner = getPathSkips(tree, child, flags)
      if (inner) {
        edges.push(...inner)
      }
    }
    return edges

    // for (const child of curr.children) {
    //   const end = tree[child]
    //   if (!end) continue

    //   if (flags.debug) {
    //     // if (end.children.size === 1) {
    //     //   const subpath = getPathSkips(tree, end.msg._id, flags)
    //     //   if (!subpath) continue
    //     //   if (!Array.isArray(subpath)) {
    //     //     paths.push({ start, end: subpath.end, length: length + subpath.length })
    //     //     continue
    //     //   }
    //     //   const mapped = subpath.map((sub) => ({
    //     //     start,
    //     //     end: sub.end,
    //     //     length: length + sub.length,
    //     //   }))
    //     //   paths.push(...mapped)
    //     //   continue
    //     // }
    //   }

    //   paths.push({ start: curr, end, length })
    // }
    return edges
  } while (true)
}

function toLabel(msg: AppSchema.ChatMessage) {
  return toShortDuration(msg.createdAt, 1)
}
