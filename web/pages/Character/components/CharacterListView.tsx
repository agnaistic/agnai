import { Component, For, Show, createSignal } from 'solid-js'
import Divider from '/web/shared/Divider'
import { ViewProps } from './types'
import { AppSchema } from '/common/types'
import { A, useNavigate } from '@solidjs/router'
import { CharacterAvatar } from '/web/shared/AvatarIcon'
import { Copy, Download, Edit, MessageCircle, MoreHorizontal, Star, Trash } from 'lucide-solid'
import { DropMenu } from '/web/shared/DropMenu'
import Button from '/web/shared/Button'

export const CharacterListView: Component<ViewProps> = (props) => {
  return (
    <div class="flex w-full flex-col gap-2 pb-5">
      <For each={props.groups}>
        {(group) => (
          <>
            <Show when={props.showGrouping && group.label}>
              <h2 class="text-xl font-bold">{group.label}</h2>
            </Show>
            <For each={group.list}>
              {(char) => (
                <Character
                  type={'list'}
                  char={char}
                  delete={() => props.setDelete(char)}
                  download={() => props.setDownload(char)}
                  toggleFavorite={(value) => props.toggleFavorite(char._id, value)}
                />
              )}
            </For>
            <Divider />
          </>
        )}
      </For>
    </div>
  )
}

const Character: Component<{
  type: string
  char: AppSchema.Character
  delete: () => void
  download: () => void
  toggleFavorite: (value: boolean) => void
}> = (props) => {
  const [listOpts, setListOpts] = createSignal(false)
  const nav = useNavigate()

  return (
    <div class="bg-800 flex w-full flex-row items-center justify-between gap-4 rounded-xl px-2 py-1 hover:bg-[var(--bg-700)]">
      <A
        class="ellipsis flex h-3/4 grow cursor-pointer items-center gap-4"
        href={`/character/${props.char._id}/chats`}
      >
        <CharacterAvatar char={props.char} zoom={1.75} />
        <div class="flex max-w-full flex-col overflow-hidden">
          <span class="ellipsis font-bold">{props.char.name}</span>
          <span class="ellipsis">{props.char.description}</span>
        </div>
      </A>
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
          <A href={`/chats/create/${props.char._id}`}>
            <MessageCircle class="icon-button" />
          </A>
          <a onClick={props.download}>
            <Download class="icon-button" />
          </a>
          <A href={`/character/${props.char._id}/edit`}>
            <Edit class="icon-button" />
          </A>
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
            <Button onClick={() => props.toggleFavorite(!props.char.favorite)} size="sm">
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
            <Button alignLeft onClick={() => nav(`/character/${props.char._id}/edit`)} size="sm">
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
    </div>
  )
}
