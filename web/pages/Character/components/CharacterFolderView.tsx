import { Component, For, Show, createMemo } from 'solid-js'
import { CardProps, SortDirection, ViewProps } from './types'
import { AppSchema } from '/common/types'
import { slugify } from '/common/util'
import { createStore } from 'solid-js/store'
import { Card } from '/web/shared/Card'
import { FolderClosed, FolderOpen } from 'lucide-solid'
import { CharacterAvatar } from '/web/shared/AvatarIcon'
import { A } from '@solidjs/router'

type FolderTree = { [folder: string]: { depth: number; list: AppSchema.Character[] } }

const randomFolders = ['/', '/foo', '/foo/bar/', '/foo/qux', '/test']

function random() {
  const ele = Math.floor(Math.random() * randomFolders.length)
  return randomFolders[ele]
}

export const CharacterFolderView: Component<
  ViewProps & { characters: AppSchema.Character[]; sort: SortDirection }
> = (props) => {
  const sort = (l: AppSchema.Character, r: AppSchema.Character) => {
    return l.name.localeCompare(r.name) * (props.sort === 'asc' ? 1 : -1)
  }
  const folders = createMemo(() => {
    const tree: FolderTree = { '/': { depth: 1, list: [] } }
    for (const char of props.characters) {
      let folder = char.folder || random()
      if (!folder.startsWith('/')) {
        folder = '/' + folder
      }

      if (!folder.endsWith('/')) {
        folder += '/'
      }

      folder = toFolderSlug(folder)
      const depth = folder.match(/\//g)?.length ?? 0

      if (!tree[folder]) {
        tree[folder] = { depth, list: [] }
      }

      tree[folder].list.push(char)
    }

    for (const folder in tree) {
      tree[folder].list.sort(sort)
    }

    return tree
  })

  const [states, setStates] = createStore<Record<string, boolean>>({})

  const getChildFolders = (folder: string) => {
    const all = folders()
    const parent = all[folder]
    const children: Array<{ folder: string; chars: AppSchema.Character[]; depth: number }> = []

    const prefix = folder.endsWith('/') ? folder : folder + '/'
    const target = parent.depth + 1
    for (const [key, { depth, list }] of Object.entries(all)) {
      if (depth !== target) continue
      if (all[key] === parent) continue
      if (key.startsWith(prefix)) {
        children.push({ folder: key, chars: list, depth })
      }
    }

    children.sort((l, r) => l.folder.localeCompare(r.folder) * (props.sort === 'asc' ? 1 : -1))

    return children
  }

  const toggle = (id: string) => {
    const prev = states[id] ?? false
    setStates(id, !prev)
  }

  return (
    <div class="flex flex-col gap-1">
      <For each={getChildFolders('/')}>
        {(item) => (
          <Card class="flex flex-col gap-1">
            <div class="flex cursor-pointer items-center gap-1" onClick={() => toggle(item.folder)}>
              <Show when={!states[item.folder]}>
                <FolderClosed size={16} />
              </Show>
              <Show when={states[item.folder]}>
                <FolderOpen size={16} />
              </Show>
              <div>{item.folder}</div>
            </div>
          </Card>
        )}
      </For>
      <For each={folders()['/'].list}>
        {(char) => (
          <Character
            char={char}
            toggleFavorite={(v) => props.toggleFavorite(char._id, v)}
            delete={() => props.setDelete(char)}
            download={() => props.setDelete(char)}
          />
        )}
      </For>
    </div>
  )
}

const Character: Component<CardProps> = (props) => {
  return (
    <div class="flex w-full justify-between">
      <A
        class="ellipsis flex h-3/4 grow cursor-pointer items-center gap-4"
        href={`/character/${props.char._id}/chats`}
      >
        <CharacterAvatar format={{ size: 'xs', corners: 'circle' }} char={props.char} zoom={1.75} />
        <div class="flex max-w-full gap-1 overflow-hidden">
          <span class="ellipsis font-bold">{props.char.name}</span>
          <span class="ellipsis">{props.char.description}</span>
        </div>
      </A>
      <div>Buttons</div>
    </div>
  )
}

function toFolderSlug(name: string) {
  return name.split('/').map(slugify).join('/')
}
