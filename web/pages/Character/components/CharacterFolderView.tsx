import { Component, For, Show, createEffect, createMemo, createSignal } from 'solid-js'
import { CardProps, SortDirection, ViewProps } from './types'
import { AppSchema } from '/common/types'
import { slugify } from '/common/util'
import { createStore } from 'solid-js/store'
import {
  Copy,
  Download,
  Edit,
  FolderClosed,
  FolderCog,
  FolderOpen,
  MessageCircle,
  MoreHorizontal,
  Star,
  Trash,
} from 'lucide-solid'
import { CharacterAvatar } from '/web/shared/AvatarIcon'
import { A, useNavigate } from '@solidjs/router'
import Button from '/web/shared/Button'
import { DropMenu } from '/web/shared/DropMenu'
import { RootModal } from '/web/shared/Modal'
import TextInput from '/web/shared/TextInput'
import { on } from 'solid-js'
import { characterStore } from '/web/store'

type FolderTree = { [folder: string]: Folder }

type Folder = { path: string; depth: number; list: AppSchema.Character[] }

/**
 * Work in progress
 * @todo
 * - Assign folders to characters
 * - Move characters between folders (potentially using dragging in addition to basic modal)
 */

export const CharacterFolderView: Component<
  ViewProps & { characters: AppSchema.Character[]; sort: SortDirection }
> = (props) => {
  const [folder, setFolder] = createSignal<AppSchema.Character>()
  const sort = (l: AppSchema.Character, r: AppSchema.Character) => {
    return l.name.localeCompare(r.name) * (props.sort === 'asc' ? 1 : -1)
  }

  const folders = createMemo(() => {
    const tree: FolderTree = { '/': { path: '/', depth: 1, list: [] } }
    for (const char of props.characters) {
      let folder = char.folder || '/'
      if (!folder.startsWith('/')) {
        folder = '/' + folder
      }

      if (!folder.endsWith('/')) {
        folder += '/'
      }

      folder = toFolderSlug(folder)
      const depth = folder.match(/\//g)?.length ?? 0

      if (!tree[folder]) {
        tree[folder] = { path: folder, depth, list: [] }
      }

      tree[folder].list.push(char)
    }

    for (const folder in tree) {
      tree[folder].list.sort(sort)
    }

    return tree
  })

  const [states, setStates] = createStore<Record<string, boolean>>({ '/': true })

  const toggle = (id: string) => {
    const prev = states[id] ?? false
    console.log(id, '-->', !prev)
    setStates(id, !prev)
  }

  return (
    <div class="flex flex-col">
      <FolderContents
        folder={folders()['/']}
        tree={folders()}
        states={states}
        toggleState={toggle}
        toggleFavorite={props.toggleFavorite}
        setEdit={props.setEdit}
        setDelete={props.setDelete}
        setDownload={props.setDownload}
        setFolder={setFolder}
      />

      <ChangeFolder close={() => setFolder()} char={folder()} />
    </div>
  )
}

const FolderContents: Component<{
  folder: Folder
  tree: FolderTree
  states: Record<string, boolean>
  toggleState: (path: string) => void
  setDelete: (char: AppSchema.Character) => void
  setDownload: (char: AppSchema.Character) => void
  toggleFavorite: (id: string, state: boolean) => void
  setEdit: (char: AppSchema.Character) => void
  setFolder: (char: AppSchema.Character) => void
}> = (props) => {
  const children = createMemo(() => {
    const folders = getChildFolders(props.tree, props.folder.path, 'asc')
    return folders
  })

  return (
    <div class="rounded-md border-[1px] border-[var(--bg-700)] px-1">
      <div
        class="my-1 flex cursor-pointer items-center"
        onClick={() => props.toggleState(props.folder.path)}
      >
        <Show when={!props.states[props.folder.path]}>
          <FolderClosed size={16} />
          <div>{props.folder.path === '/' ? 'root' : props.folder.path.slice(1, -1)}</div>
        </Show>
        <Show when={props.states[props.folder.path]}>
          <FolderOpen size={16} />
          <div>{props.folder.path === '/' ? 'root' : props.folder.path.slice(1, -1)}</div>
        </Show>
      </div>

      <Show when={props.states[props.folder.path]}>
        <div class="flex flex-col gap-1">
          <For each={children()}>
            {(child) => (
              <div
                style={{
                  'margin-left': `${props.folder.depth * 6}px`,
                  'margin-right': `${props.folder.depth * 6}px`,
                }}
              >
                <FolderContents
                  folder={child}
                  setFolder={props.setFolder}
                  tree={props.tree}
                  states={props.states}
                  setDelete={props.setDelete}
                  setDownload={props.setDownload}
                  setEdit={props.setEdit}
                  toggleState={props.toggleState}
                  toggleFavorite={props.toggleFavorite}
                />
              </div>
            )}
          </For>
        </div>
        <div class="my-1 flex flex-col gap-1">
          <For each={props.folder.list}>
            {(char) => (
              <Character
                edit={() => props.setEdit(char)}
                char={char}
                toggleFavorite={(v) => props.toggleFavorite(char._id, v)}
                delete={() => props.setDelete(char)}
                download={() => props.setDelete(char)}
                folder={() => props.setFolder(char)}
              />
            )}
          </For>
        </div>
      </Show>
    </div>
  )
}

const Character: Component<CardProps & { folder: () => void }> = (props) => {
  return (
    <div class="flex h-8 w-full items-center justify-between rounded-md border-[1px] border-[var(--bg-800)] hover:border-[var(--bg-600)]">
      <A
        class="ellipsis flex h-3/4 grow cursor-pointer items-center gap-2"
        href={`/character/${props.char._id}/chats`}
      >
        <CharacterAvatar format={{ size: 'xs', corners: 'circle' }} char={props.char} zoom={1.75} />
        <div class="flex max-w-full gap-1 overflow-hidden">
          <span class="ellipsis  font-bold" style={{ 'min-width': 'fit-content' }}>
            {props.char.name}
          </span>
          <span class="ellipsis">{props.char.description}</span>
        </div>
      </A>
      <div class="mx-2 my-1">
        <CharacterListOptions
          char={props.char}
          delete={props.delete}
          download={props.download}
          edit={props.edit}
          toggleFavorite={props.toggleFavorite}
          folder={props.folder}
        />
      </div>
    </div>
  )
}

const CharacterListOptions: Component<{
  char: AppSchema.Character
  edit: () => void
  delete: () => void
  download: () => void
  toggleFavorite: (value: boolean) => void
  folder: () => void
}> = (props) => {
  const [listOpts, setListOpts] = createSignal(false)
  const nav = useNavigate()

  return (
    <div>
      <div class="hidden flex-row items-center justify-center gap-2 sm:flex">
        <Show when={props.char.favorite}>
          <Star
            class="icon-button fill-[var(--text-900)] text-[var(--text-900)]"
            onClick={() => props.toggleFavorite(false)}
          />
        </Show>
        <Show when={!props.char.favorite}>
          <Star class="icon-button" onClick={() => props.toggleFavorite(true)} />
        </Show>
        <a onClick={props.folder}>
          <FolderCog class="icon-button" />
        </a>
        <a onClick={props.download}>
          <Download class="icon-button" />
        </a>
        <a onClick={props.edit}>
          <Edit class="icon-button" />
        </a>
        <A href={`/character/create/${props.char._id}`}>
          <Copy class="icon-button" />
        </A>
        <Trash class="icon-button" onClick={props.delete} />
      </div>
      <div class="flex items-center sm:hidden" onClick={() => setListOpts(true)}>
        <MoreHorizontal class="icon-button" />
      </div>
      <DropMenu
        class="bg-[var(--bg-700)]"
        show={listOpts()}
        close={() => setListOpts(false)}
        customPosition="right-[10px]"
        // horz="left"
        vert="down"
      >
        <div class="flex flex-col gap-2 p-2 font-bold">
          <Button onClick={() => props.toggleFavorite(!props.char.favorite)} alignLeft size="sm">
            <Show when={props.char.favorite}>
              <Star class="text-900 fill-[var(--text-900)]" /> Unfavorite
            </Show>
            <Show when={!props.char.favorite}>
              <Star /> Favorite
            </Show>
          </Button>
          <Button onClick={props.folder} alignLeft size="sm">
            <FolderCog /> Folder
          </Button>
          <Button onClick={() => nav(`/chats/create/${props.char._id}`)} alignLeft size="sm">
            <MessageCircle /> Chat
          </Button>
          <Button alignLeft onClick={props.download} size="sm">
            <Download /> Download
          </Button>
          <Button alignLeft onClick={props.edit} size="sm">
            <Edit /> Edit
          </Button>
          <Button alignLeft onClick={() => nav(`/character/create/${props.char._id}`)} size="sm">
            <Copy /> Duplicate
          </Button>
          <Button alignLeft schema="red" onClick={props.delete} size="sm">
            <Trash /> Delete
          </Button>
        </div>
      </DropMenu>
    </div>
  )
}

function toFolderSlug(name: string) {
  if (!name.startsWith('/')) {
    name = '/' + name
  }

  if (!name.endsWith('/')) {
    name += '/'
  }
  return name.split('/').map(slugify).join('/')
}

function getChildFolders(tree: FolderTree, path: string, sort: SortDirection) {
  const parent = tree[path]
  const children: Array<Folder> = []

  const prefix = path.endsWith('/') ? path : path + '/'
  const target = parent.depth + 1
  for (const [key, { depth, list }] of Object.entries(tree)) {
    if (depth !== target) continue
    if (tree[key] === parent) continue
    if (key.startsWith(prefix)) {
      children.push({ path: key, list, depth })
    }
  }

  children.sort((l, r) => l.path.localeCompare(r.path) * (sort === 'asc' ? 1 : -1))

  return children
}

const ChangeFolder: Component<{ char?: AppSchema.Character; close: () => void }> = (props) => {
  let ref: HTMLInputElement

  createEffect(
    on(
      () => props.char,
      () => {
        if (!props.char) return

        ref.value = props.char.folder || '/'
        ref.focus()
      }
    )
  )

  const save = () => {
    let folder = ref.value
    if (!folder.startsWith('/')) {
      folder = '/' + folder
    }

    if (folder.endsWith('/')) {
      folder = folder.slice(0, -1)
    }

    characterStore.editPartialCharacter(props.char?._id!, { folder: ref.value }, () =>
      props.close()
    )
  }

  return (
    <RootModal
      show={!!props.char}
      close={props.close}
      footer={
        <>
          <Button onClick={props.close}>Cancel</Button>
          <Button onClick={save}>Save</Button>
        </>
      }
    >
      <div class="flex flex-col gap-2">
        <TextInput
          fieldName="original-folder"
          disabled
          label="Current Folder"
          value={props.char?.folder || '/'}
        />

        <TextInput
          fieldName="next-folder"
          ref={(r) => (ref = r)}
          label="New Folder"
          value={props.char?.folder || '/'}
        />
      </div>
    </RootModal>
  )
}
