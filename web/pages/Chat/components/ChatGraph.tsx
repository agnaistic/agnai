import cyto, { NodeSingular } from 'cytoscape'
import dagre from 'cytoscape-dagre'
import { Component, createEffect, createSignal, on, onCleanup, onMount } from 'solid-js'
import { ChatNode, ChatTree } from '/common/chat'
import { msgStore, pageStore } from '/web/store'
import { getSettingColor } from '/web/shared/colors'
import { FeatureFlags } from '/web/store/flags'
import { AppSchema } from '/common/types'
import { SetStoreFunction } from 'solid-js/store'
import { ComponentEmit, ComponentSubscriber, toShortDuration } from '/web/shared/util'
import { debug } from '/common/debug'
import { getStore } from '/web/store/create'

export { ChatGraph as default }

cyto.use(dagre as any)

export type GraphState = {
  hovered: string
  clicked: string
  rejoin: string
  parent: string
  msg?: AppSchema.ChatMessage
}

const log = debug('graph')

export const ChatGraph: Component<{
  leafId: string
  dir?: string
  nodes: 'short' | 'full'
  state: GraphState
  setter: SetStoreFunction<GraphState>
  emit: ComponentEmit<'reset' | 'click' | 'hover' | 'unhover'>
  sub: ComponentSubscriber<'reset' | 'click' | 'hover' | 'unhover'>
}> = (props) => {
  let cyRef: any

  const graph = msgStore((s) => ({ tree: s.graph.tree, root: s.graph.root }))
  const flags = pageStore((s) => s.flags)

  const [instance, setInstance] = createSignal<cyto.Core>()
  const init = (ref: HTMLDivElement, tree: ChatTree) => {
    cyRef = ref
    redraw()
  }

  const redraw = () => {
    const {
      graph: { tree, root },
    } = getStore('messages').getState()
    log('redraw')
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
          ? getAllElements(tree, props.state, props.leafId)
          : getElements(tree, props.state, root, props.leafId, flags),
    })

    // cy.on('click', 'node', function (this: any, evt) {
    //   console.log(this.id(), 'click')
    //   props.emit.click(this.id(), this)
    // })

    cy.on('tap', 'node', function (this: any, evt) {
      props.emit.click(this.id(), this)
      recolor()
    })

    cy.on('mouseover', 'node', function (this: any, evt) {
      props.emit.hover(this.id(), this)
      document.body.style.cursor = 'pointer'
      styleNode(tree, props.state, this, props.leafId)
      // this.style('border-color', getSettingColor('hl-200'))
      // this.style('border-width', '4')
    })

    cy.on('mouseout', 'node', function (this: any) {
      props.emit.unhover()
      styleNode(tree, props.state, this, props.leafId)
      document.body.style.cursor = ''

      // const id = this.id()
      // if (props.state.clicked === id) {
      //   this.style('border-color', getSettingColor('green-400'))
      //   this.style('border-width', '4')
      //   return
      // }
      // this.style('border-width', '0')
    })

    const win: any = window
    win.cy = cy
    cy.reset()
    cy.fit()
    cy.center()

    setInstance(cy)
    return cy
  }

  const recolor = () => {
    const {
      graph: { tree },
    } = getStore('messages').getState()
    const cy = instance()
    if (!cy) return

    const nodes = cy.nodes()

    nodes.each((ele) => {
      styleNode(tree, props.state, ele, props.leafId)
    })
  }

  createEffect(
    on(
      () => graph.tree,
      (tree) => {
        const latest = getStore('messages').getState()
        log('tree changed')
        const win: any = window
        win.tree = { ...latest.graph.tree }
        const cy = instance()
        if (!cy) return

        redraw()
      }
    )
  )

  createEffect(
    on(
      () => props.nodes,
      () => {
        log('graph size: %s', props.nodes)
        const cy = instance()
        if (!cy) return

        redraw()
        recolor()
      }
    )
  )

  createEffect(
    on(
      () => props.leafId,
      () => {
        recolor()
      }
    )
  )

  createEffect(
    on(
      () => props.dir,
      (dir) => {
        log('direction: %s', props.dir)
        const result = instance()?.layout({ name: 'dagre', rankDir: dir || 'LR' } as any)
        result?.run()
        redraw()
        recolor()
      }
    )
  )

  onMount(() => {
    props.sub('reset', () => {
      redraw()
      recolor()
    })
  })

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

function getElements(
  tree: ChatTree,
  state: GraphState,
  root: string,
  leafId: string,
  flags: FeatureFlags
) {
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
          'background-color': getNodeColor(tree, state, leafId, smsg._id),
        },
      })
    }

    if (!visited.has(emsg._id)) {
      visited.add(emsg._id)
      elements.push({
        group: 'nodes',
        data: { id: emsg._id, label: toLabel(emsg) },
        style: {
          'background-color': getNodeColor(tree, state, leafId, emsg._id),
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

function getAllElements(tree: ChatTree, state: GraphState, leafId: string) {
  const elements: cyto.ElementDefinition[] = []

  for (const node of Object.values(tree)) {
    elements.push({
      group: 'nodes',
      data: { id: node.msg._id, label: toLabel(node.msg) },
      style: {
        'background-color': getNodeColor(tree, state, leafId, node.msg._id),
      },
    })
  }

  for (const node of Object.values(tree)) {
    if (node.msg.parent) {
      const parent = tree[node.msg.parent]
      if (!parent) {
        log(`[${node.msg._id.slice(0, 4)}] parent missing: ${node.msg.parent}`)
        continue
      }

      elements.push({
        group: 'edges',
        data: { source: node.msg.parent, target: node.msg._id },
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

  const skips = getPathSkips(tree, root) || []
  const orphans: string[] = []

  for (const msgId in tree) {
    const msg = tree[msgId]
    if (!msg) continue

    if (!msg.msg.parent) continue
    const parent = tree[msg.msg.parent]
    if (parent) continue

    orphans.push(msgId)
  }

  for (const orphan of orphans) {
    const orphanSkips = getPathSkips(tree, orphan)
    if (orphanSkips) {
      log('sub-tree: %s', orphan.slice(0, 4))
      skips.push(...orphanSkips)
    }
  }

  return skips
}

function getPathSkips(tree: ChatTree, id: string): PathSkip[] | undefined {
  const start = tree[id]

  const visited = new Set<string>([id])
  let curr = tree[id]
  if (!curr) return
  let length = 1

  do {
    if (Object.keys(curr.children).length === 0) {
      if (id === curr.msg._id) return
      return [{ start, end: curr, length }]
    }

    if (Object.keys(curr.children).length === 1) {
      const next = Object.keys(curr.children)[0]
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
    for (const child in curr.children) {
      const end = tree[child]
      if (!end) continue

      edges.push({ start: curr, end, length: 1 })

      const inner = getPathSkips(tree, child)
      if (inner) {
        edges.push(...inner)
      }
    }
    return edges
  } while (true)
}

function toLabel(msg: AppSchema.ChatMessage) {
  const duration = toShortDuration(msg.createdAt, 1)
  const up = msg.parent ? msg.parent.slice(0, 4) : 'root'
  const self = msg._id.slice(0, 4)
  return self
  return `${up} - ${duration} - ${self}`
}

function getNodeColor(tree: ChatTree, state: GraphState, leafId: string, nodeId: string) {
  if (nodeId === state.clicked) return getSettingColor('red-500')
  if (nodeId === leafId) return getSettingColor('green-500')
  const node = tree[nodeId]?.msg

  if (node?.userId) return getSettingColor('bg-500')
  return getSettingColor('hl-500')
}

function getNodeStyles(tree: ChatTree, state: GraphState, leafId: string, nodeId: string) {
  const color = getNodeColor(tree, state, leafId, nodeId)
  if (state.hovered === nodeId) {
    return {
      'background-color': color,
      'border-color': getSettingColor('green-400'),
      'border-width': '4',
    }
  }

  if (state.clicked === nodeId) {
    return {
      'background-color': color,
      'border-color': getSettingColor('hl-200'),
      'border-width': '4',
    }
  }

  return {
    'background-color': color,
    'border-color': color,
    'border-width': '4',
  }
}

function styleNode(tree: ChatTree, state: GraphState, node: NodeSingular, leafId: string) {
  const id = node.id()

  const styles = getNodeStyles(tree, state, leafId, id)
  node.style(styles)
}
