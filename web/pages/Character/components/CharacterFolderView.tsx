import { Component, For, JSX, Show, createEffect, createMemo, createSignal } from 'solid-js'
import { CardProps, ListCharacter, SortDirection, ViewProps } from './types'
import { AppSchema } from '/common/types'
import { slugify } from '/common/util'
import {
  useDragDropContext,
  createDraggable,
  createDroppable,
  DragOverlay,
} from '@thisbeyond/solid-dnd'

import {
  Copy,
  Download,
  Edit,
  GripHorizontal,
  MessageCircle,
  MoreHorizontal,
  Star,
  Trash,
} from 'lucide-solid'
import { CharacterAvatar } from '/web/shared/AvatarIcon'
import { A, useNavigate, useSearchParams } from '@solidjs/router'
import Button from '/web/shared/Button'
import { DropMenu } from '/web/shared/DropMenu'
import { HelpModal, RootModal } from '/web/shared/Modal'
import TextInput from '/web/shared/TextInput'
import { on } from 'solid-js'
import { characterStore, chatStore } from '/web/store'
import { ManualPaginate, usePagination } from '/web/shared/Paginate'
import Divider from '/web/shared/Divider'
import { useResizeObserver } from '/web/shared/hooks'

type FolderTree = { [folder: string]: Folder }

type Folder = { path: string; depth: number; list: AppSchema.Character[] }

export const CharacterFolderView: Component<
  ViewProps & { characters: AppSchema.Character[]; favorites: AppSchema.Character[] }
> = (props) => {
  const chars = chatStore()
  const [search, setSearch] = useSearchParams()
  const [, { onDragStart, onDragEnd }] = useDragDropContext()!
  const size = useResizeObserver()

  const [changeFolder, setChangeFolder] = createSignal<AppSchema.Character>()
  const [folder, setFolder] = createSignal(search.folder || '/')
  const [dragging, setDragging] = createSignal<ListCharacter>()
  const newDrop = createDroppable('new-folder')

  const selectFolder = (folder: string) => {
    setSearch({ folder })
    setFolder(toFolderSlug(folder))
  }

  onDragStart(({ draggable }) => {
    setDragging(draggable.data as any)
  })

  onDragEnd(({ draggable, droppable }) => {
    const char = dragging()
    setDragging()

    if (!droppable) return
    if (droppable.id === 'new-folder') {
      setChangeFolder(char)
      return
    }

    if (!char) return
    characterStore.editPartialCharacter(char._id, { folder: droppable.id as string })
  })

  const wrapStyle = createMemo(() => {
    const rect = size.size()
    if (!rect.x || !rect.y) return
    const css: JSX.CSSProperties = {
      'max-height': `${document.body.clientHeight - rect.y - 48}px`,
    }

    return css
  })

  const faveChars = createMemo(() => {
    const name = toFolderSlug(folder())
    const faves = props.favorites.filter((ch) => name === toFolderSlug(ch.folder || ''))
    return faves
  })

  const folderChars = createMemo(() => {
    const name = toFolderSlug(folder())
    const chars = props.characters.filter((ch) => name === toFolderSlug(ch.folder || ''))
    return chars
  })

  const pager = usePagination({
    name: 'character-list',
    items: folderChars,
    pageSize: 50,
  })

  const folders = createMemo(() => {
    const tree: FolderTree = { '/': { path: '/', depth: 1, list: [] } }
    for (const char of chars.allChars.list) {
      let folder = toFolderSlug(char.folder || '')
      const depth = folder.match(/\//g)?.length ?? 0

      if (!tree[folder]) {
        tree[folder] = { path: folder, depth, list: [] }
      }

      let curr = folder
      do {
        const parent = getFolderParent(curr)
        if (!parent) break
        curr = parent
        if (!tree[parent]) {
          tree[parent] = { path: parent, depth: parent.match(/\//g)?.length ?? 0, list: [] }
        }
      } while (true)

      if (props.characters.some((ch) => ch._id === char._id)) {
        tree[folder].list.push(char)
      }
    }

    return tree
  })

  return (
    <div class="flex h-full max-h-full w-full flex-col gap-2 rounded-md">
      <div class="my-1 flex w-full justify-center">
        <ManualPaginate size="sm" pager={pager} />
      </div>

      <div class="flex w-full" ref={(ref) => size.load(ref)} style={wrapStyle()}>
        <div class="flex min-w-[200px] max-w-[200px] flex-col gap-1 overflow-y-auto">
          <HelpModal title="Instructions" cta={<Button size="pill">Folders Guide</Button>}>
            <div class="flex flex-col gap-1">
              <div class="flex items-center gap-0.5">
                - Drag the <GripHorizontal size={16} /> icon to move a character
              </div>
              <div>
                - Drag a character to <b>NEW FOLDER</b> to create a new folder
              </div>
              <div>- Drag a character onto a folder to move the character</div>
            </div>
          </HelpModal>
          <div
            ref={(ref) => newDrop(ref)}
            class="text-300 decoration-dotted"
            classList={{
              'text-900': !!dragging() && !newDrop.isActiveDroppable,
              'text-[var(--hl-500)]': newDrop.isActiveDroppable,
              underline: newDrop.isActiveDroppable,
            }}
          >
            + New Folder
          </div>
          <FolderContents
            folder={folders()['/']}
            tree={folders()}
            current={folder()}
            toggleFavorite={props.toggleFavorite}
            setEdit={props.setEdit}
            setDelete={props.setDelete}
            setDownload={props.setDownload}
            setFolder={folders}
            select={selectFolder}
          />
        </div>

        <div class="flex w-full flex-col gap-1 overflow-y-scroll">
          <For each={faveChars()}>
            {(char) => (
              <Character
                edit={() => props.setEdit(char)}
                char={char}
                toggleFavorite={(v) => props.toggleFavorite(char._id, v)}
                delete={() => props.setDelete(char)}
                download={() => props.setDownload(char)}
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
                download={() => props.setDownload(char)}
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

      <Show when={dragging()}>
        <DragOverlay>
          <div class="flex gap-2 rounded-md border-[1px] border-solid border-[var(--bg-500)] p-0.5">
            <CharacterAvatar
              format={{ size: 'sm', corners: 'circle' }}
              char={dragging()!}
              zoom={1.75}
            />
            {dragging()?.name}
          </div>
        </DragOverlay>
      </Show>
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

  const drop = createDroppable(props.folder.path)

  return (
    <div class="w-full" classList={{}}>
      <div
        class="my-1 flex w-full items-center decoration-dotted"
        classList={{
          'text-500': props.folder.list.length === 0,
          'cursor-pointer': props.folder.list.length > 0,
          'cursor-not-allowed': props.folder.list.length === 0,
          'text-[var(--hl-500)]': drop.isActiveDroppable,
          underline: drop.isActiveDroppable,
        }}
        onClick={() => (props.folder.list.length > 0 ? props.select(props.folder.path) : undefined)}
        ref={(ref) => drop(ref)}
      >
        <Show when={props.current !== toFolderSlug(props.folder.path)}>
          <div class="mr-1">○</div>
          <div>{props.folder.path === '/' ? 'root' : props.folder.path.slice(1, -1)}</div>
        </Show>
        <Show when={props.current === toFolderSlug(props.folder.path)}>
          <div class="mr-1">•</div>
          <div
            class="text-[var(--hl-300)]"
            style={{
              'text-shadow': '0 0 10px var(--hl-400)',
            }}
          >
            {props.folder.path === '/' ? 'root' : props.folder.path.slice(1, -1)}
          </div>
        </Show>
      </div>

      <div class="flex flex-col gap-1 font-mono text-sm font-bold">
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
  const drag = createDraggable(props.char._id, props.char)
  return (
    <div class="flex w-[calc(100%-24px)] select-none items-center gap-2 rounded-md border-[1px] border-[var(--bg-800)] hover:border-[var(--bg-600)]">
      <div ref={(ref) => drag(ref)} class="cursor-grab" style={{ 'touch-action': 'none' }}>
        <GripHorizontal color="var(--bg-500)" />
      </div>

      <A
        class="ellipsis flex w-full cursor-pointer items-center gap-2"
        href={`/character/${props.char._id}/chats`}
      >
        <CharacterAvatar format={{ size: 'sm', corners: 'circle' }} char={props.char} zoom={1.75} />
        <div class="flex w-full flex-col overflow-hidden">
          <div class="w-full overflow-hidden text-ellipsis whitespace-nowrap">
            {props.char.name}
          </div>
          <Show when={!!props.char.description}>
            <div class="text-600 ellipsis text-sm">{props.char.description}&nbsp;</div>
          </Show>
        </div>
      </A>

      <CharacterListOptions
        char={props.char}
        delete={props.delete}
        download={props.download}
        edit={props.edit}
        toggleFavorite={props.toggleFavorite}
      />
    </div>
  )
}

const CharacterListOptions: Component<{
  char: AppSchema.Character
  edit: () => void
  delete: () => void
  download: () => void
  toggleFavorite: (value: boolean) => void
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
  return name.split('/').map(slugify).join('/').toLowerCase()
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
  const [name, setName] = createSignal(props.char?.folder || '')
  const actual = createMemo(() => toFolderSlug(name()))

  createEffect(
    on(
      () => props.char,
      () => {
        if (!props.char) return
        setName(props.char.folder || '/')
      }
    )
  )

  const save = () => {
    let folder = actual()
    if (!folder.startsWith('/')) {
      folder = '/' + folder
    }

    if (folder.endsWith('/')) {
      folder = folder.slice(0, -1)
    }

    characterStore.editPartialCharacter(props.char?._id!, { folder }, () => props.close())
  }

  return (
    <RootModal
      title={`Change Folder: ${props.char?.name}`}
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
          helperMarkdown={`Folder names are 'normalized'.\nNormalized name: ${actual()}`}
          label="New Folder"
          value={name()}
          onChange={(ev) => setName(ev.currentTarget.value)}
        />
      </div>
    </RootModal>
  )
}

/**
 * Cases:
 * - /
 * - /foo/
 * - /foo/bar/
 * - /far/bar/baz/
 */
function getFolderParent(folder: string) {
  if (folder === '/') return

  if (folder.endsWith('/')) {
    folder = folder.slice(0, -1)
  }

  const index = folder.lastIndexOf('/')
  if (index <= 0) return

  return folder.slice(0, index + 1)
}
