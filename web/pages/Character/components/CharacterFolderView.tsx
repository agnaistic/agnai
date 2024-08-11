import { Component, For, Show, createEffect, createMemo, createSignal } from 'solid-js'
import { CardProps, SortDirection, ViewProps } from './types'
import { AppSchema } from '/common/types'
import { slugify } from '/common/util'

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
import { ManualPaginate, usePagination } from '/web/shared/Paginate'
import Divider from '/web/shared/Divider'
import Draggable from '/web/shared/Draggable'

type FolderTree = { [folder: string]: Folder }

type Folder = { path: string; depth: number; list: AppSchema.Character[] }

/**
 * Work in progress
 * @todo
 * - Move characters between folders (potentially using dragging in addition to basic modal)
 */

export const CharacterFolderView: Component<
  ViewProps & { characters: AppSchema.Character[]; favorites: AppSchema.Character[] }
> = (props) => {
  const [changeFolder, setChangeFolder] = createSignal<AppSchema.Character>()
  const [folder, setFolder] = createSignal('/')

  const faveChars = createMemo(() => {
    const name = normalize(folder())
    const faves = props.favorites.filter((ch) => name === normalize(ch.folder || ''))
    return faves
  })

  const folderChars = createMemo(() => {
    const name = normalize(folder())
    const chars = props.characters.filter((ch) => name === normalize(ch.folder || ''))
    return chars
  })

  const pager = usePagination({
    name: 'character-list',
    items: folderChars,
    pageSize: 50,
  })

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
      tree[folder].list
    }

    return tree
  })

  return (
    <div class="flex w-full flex-col gap-2 rounded-md border-[1px] border-[var(--bg-700)]">
      <div class="my-1 flex w-full justify-center">
        <ManualPaginate size="sm" pager={pager} />
      </div>

      <div class="flex w-full gap-1">
        <div class="flex w-full min-w-[200px] max-w-[200px] gap-1 px-1">
          <FolderContents
            folder={folders()['/']}
            tree={folders()}
            current={normalize(folder())}
            toggleFavorite={props.toggleFavorite}
            setEdit={props.setEdit}
            setDelete={props.setDelete}
            setDownload={props.setDownload}
            setFolder={setChangeFolder}
            select={setFolder}
          />
        </div>

        <div class="w-min overflow-x-hidden">
          <For each={faveChars()}>
            {(char) => (
              <Character
                edit={() => props.setEdit(char)}
                char={char}
                toggleFavorite={(v) => props.toggleFavorite(char._id, v)}
                delete={() => props.setDelete(char)}
                download={() => props.setDelete(char)}
                folder={() => setChangeFolder(char)}
              />
            )}
          </For>

          <Show when={faveChars().length && pager.items().length}>
            <Divider />
          </Show>

          <For each={pager.items()}>
            {(char) => (
              <Character
                edit={() => props.setEdit(char)}
                char={char}
                toggleFavorite={(v) => props.toggleFavorite(char._id, v)}
                delete={() => props.setDelete(char)}
                download={() => props.setDelete(char)}
                folder={() => setChangeFolder(char)}
              />
            )}
          </For>
        </div>
      </div>

      <div class="mb-1 flex w-full justify-center">
        <ManualPaginate size="sm" pager={pager} />
      </div>

      <ChangeFolder close={() => setChangeFolder()} char={changeFolder()} />
    </div>
  )
}

const FolderContents: Component<{
  folder: Folder
  tree: FolderTree
  current: string
  select: (folder: string) => void
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
    <div class="">
      <div
        class="my-1 flex cursor-pointer items-center"
        onClick={() => props.select(props.folder.path)}
      >
        <Show when={props.current !== normalize(props.folder.path)}>
          <FolderClosed size={16} />
          <div>{props.folder.path === '/' ? 'root' : props.folder.path.slice(1, -1)}</div>
        </Show>
        <Show when={props.current === normalize(props.folder.path)}>
          <FolderOpen size={16} />
          <div>{props.folder.path === '/' ? 'root' : props.folder.path.slice(1, -1)}</div>
        </Show>
      </div>

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
                select={props.select}
                current={props.current}
                folder={child}
                setFolder={props.setFolder}
                tree={props.tree}
                setDelete={props.setDelete}
                setDownload={props.setDownload}
                setEdit={props.setEdit}
                toggleFavorite={props.toggleFavorite}
              />
            </div>
          )}
        </For>
      </div>
    </div>
  )
}

const Character: Component<CardProps & { folder: () => void }> = (props) => {
  return (
    <Draggable onChange={() => {}} onDone={() => {}}>
      <div class="flex items-center justify-between rounded-md border-[1px] border-[var(--bg-800)] hover:border-[var(--bg-600)]">
        <A
          class="ellipsis flex cursor-pointer items-center gap-2"
          href={`/character/${props.char._id}/chats`}
        >
          <CharacterAvatar
            format={{ size: 'sm', corners: 'circle' }}
            char={props.char}
            zoom={1.75}
          />
          <div class="flex flex-col overflow-hidden">
            <div class="w-min overflow-hidden text-ellipsis whitespace-nowrap font-bold">
              {props.char.name}
            </div>
            <div class="ellipsis text-600 w-min text-sm">{props.char.description}</div>
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
    </Draggable>
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

function normalize(folder: string) {
  if (!folder) return '/'

  if (folder.endsWith('/')) {
    folder = folder.slice(0, -1)
  }

  if (!folder.startsWith('/')) {
    folder = '/' + folder
  }

  return folder
}
