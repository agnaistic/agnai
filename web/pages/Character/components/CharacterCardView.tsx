import { Component, For, Match, Show, Switch, createSignal } from 'solid-js'
import { CardProps, ViewProps } from './types'
import Divider from '/web/shared/Divider'
import { A, useNavigate } from '@solidjs/router'
import AvatarContainer from '/web/shared/Avatar/Container'
import { getAssetUrl, toDuration } from '/web/shared/util'
import {
  ArrowRight,
  Copy,
  Download,
  Menu,
  MessageCirclePlus,
  Pencil,
  Star,
  Trash,
  VenetianMask,
} from 'lucide-solid'
import { DropMenu } from '/web/shared/DropMenu'
import Button from '/web/shared/Button'

export const CharacterCardView: Component<ViewProps> = (props) => {
  return (
    <For each={props.groups}>
      {(group, i) => (
        <>
          <Show when={props.showGrouping}>
            <h2 class="text-xl font-bold">{group.label}</h2>
          </Show>
          <div class="grid w-full grid-cols-[repeat(auto-fit,minmax(160px,1fr))] flex-row flex-wrap justify-start gap-2 py-2">
            <For each={group.list}>
              {(char) => (
                <Character
                  edit={() => props.setEdit(char)}
                  char={char}
                  delete={() => props.setDelete(char)}
                  download={() => props.setDownload(char)}
                  toggleFavorite={(value) => props.toggleFavorite(char._id, value)}
                />
              )}
            </For>
            <Show when={group.list.length < 4}>
              <For each={new Array(4 - group.list.length)}>{() => <div></div>}</For>
            </Show>
          </div>
          <Show when={i() < props.groups.length - 1}>
            <Divider />
          </Show>
        </>
      )}
    </For>
  )
}

const Character: Component<CardProps> = (props) => {
  const [opts, setOpts] = createSignal(false)
  const nav = useNavigate()

  let ref: any

  const size = 20

  return (
    <div
      ref={ref}
      class="bg-800 flex flex-col items-center justify-between gap-1 rounded-lg border-[1px] border-[var(--bg-700)]"
    >
      <div class="w-full">
        <Switch>
          <Match when={props.char.visualType === 'sprite' && props.char.sprite}>
            <A
              href={`/character/${props.char._id}/chats`}
              class="block h-32 w-full justify-center overflow-hidden rounded-lg"
            >
              <AvatarContainer container={ref} body={props.char.sprite} />
            </A>
          </Match>
          <Match when={props.char.avatar}>
            <A
              href={
                props.char.chat
                  ? `/chat/${props.char.chat._id}`
                  : `/character/${props.char._id}/chats`
              }
              class="block h-32 w-full justify-center overflow-hidden rounded-lg rounded-b-none"
            >
              <img
                src={getAssetUrl(props.char.avatar!)}
                class="h-full w-full object-cover"
                style="object-position: 50% 30%;"
              />
            </A>
          </Match>
          <Match when>
            <A
              href={`/character/${props.char._id}/chats`}
              class="bg-700 flex h-32 w-full items-center justify-center rounded-lg rounded-b-none"
            >
              <VenetianMask size={24} />
            </A>
          </Match>
        </Switch>
      </div>
      <div class="w-full text-sm">
        <div class="overflow-hidden text-ellipsis whitespace-nowrap px-1 text-center font-bold">
          <A class="link" href={`/character/${props.char._id}/chats`}>
            {props.char.name}
          </A>
        </div>
        <div class="text-600 line-clamp-3 h-[3rem] text-ellipsis px-1 text-center text-xs font-normal">
          {props.char.description}
        </div>
        <div class="flex justify-between p-1">
          <button
            onClick={() => props.toggleFavorite(!props.char.favorite)}
            aria-label="Toggle Favorite"
          >
            <Show when={props.char.favorite}>
              <Star size={size} class="text-900 fill-[var(--text-900)]" />
            </Show>

            <Show when={!props.char.favorite}>
              <Star size={size} />
            </Show>
          </button>

          <div class="text-500 text-xs italic">
            {props.char.chat ? toDuration(new Date(props.char.chat.updatedAt)) + ' ago' : ''}
          </div>

          <Switch>
            <Match when={props.char.chat}>
              <button
                onClick={() => nav(`/chat/${props.char.chat?._id}`)}
                aria-label="Open Recent Chat"
              >
                <ArrowRight size={size} />
              </button>
            </Match>

            <Match when={!props.char.chat}>
              <button
                onClick={() => nav(`/chats/create/${props.char._id}`)}
                aria-label="Open Character Chats"
              >
                <ArrowRight size={size} />
              </button>
            </Match>
          </Switch>
        </div>
        <div class="float-left ml-[3px] mt-[-224px]">
          <div
            class="cursor-pointer rounded-md border-[1px] border-[var(--bg-400)] bg-[var(--bg-700)] p-[2px]"
            onClick={props.download}
          >
            <Download size={size} />
          </div>
        </div>
        {/* hacky positioning shenanigans are necessary as opposed to using an
            absolute positioning because if any of the DropMenu parent is
            positioned, then DropMenu breaks because it relies on the nearest
            positioned parent to be the sitewide container */}
        <div
          class="float-right mr-[3px] mt-[-224px] flex justify-end"
          onClick={() => setOpts(true)}
        >
          <div class="rounded-md border-[1px] border-[var(--bg-400)] bg-[var(--bg-700)] p-[2px]">
            <Menu size={size} class="icon-button" color="var(--bg-100)" />
          </div>
          <DropMenu
            show={opts()}
            close={() => setOpts(false)}
            customPosition="right-[9px] top-[6px]"
          >
            <div class="flex flex-col gap-2 p-2">
              <Button alignLeft onClick={() => nav(`/chats/create/${props.char._id}`)} size="sm">
                <MessageCirclePlus size={size} /> New Chat
              </Button>

              <Button onClick={props.edit} aria-label="Edit" alignLeft size="sm">
                <Pencil size={size} /> Edit
              </Button>

              <Button
                alignLeft
                onClick={() => nav(`/character/create/${props.char._id}`)}
                size="sm"
              >
                <Copy /> Duplicate
              </Button>

              <Button
                alignLeft
                size="sm"
                schema="red"
                onClick={() => {
                  setOpts(false)
                  props.delete()
                }}
              >
                <Trash /> Delete
              </Button>
            </div>
          </DropMenu>
        </div>
      </div>
    </div>
  )
}
