import { Component, For, Show, createSignal } from 'solid-js'
import Divider from '/web/shared/Divider'
import { ViewProps } from './types'
import { AppSchema } from '/common/types'
import { A, useNavigate } from '@solidjs/router'
import { CharacterAvatar } from '/web/shared/AvatarIcon'
import { Copy, Download, Edit, MessageCircle, MoreHorizontal, Star, Trash } from 'lucide-solid'
import { DropMenu } from '/web/shared/DropMenu'
import Button from '/web/shared/Button'
import { useTransContext } from '@mbarzda/solid-i18next'

export const CharacterListView: Component<ViewProps> = (props) => {
  return (
    <div class="flex w-full flex-col gap-2">
      <For each={props.groups}>
        {(group, i) => (
          <>
            <Show when={props.showGrouping && group.label}>
              <h2 class="text-xl font-bold">{group.label}</h2>
            </Show>
            <For each={group.list}>
              {(char) => (
                <Character
                  type={'list'}
                  char={char}
                  edit={() => props.setEdit(char)}
                  delete={() => props.setDelete(char)}
                  download={() => props.setDownload(char)}
                  toggleFavorite={(value) => props.toggleFavorite(char._id, value)}
                />
              )}
            </For>
            <Show when={i() < props.groups.length - 1}>
              <Divider />
            </Show>
          </>
        )}
      </For>
    </div>
  )
}

const Character: Component<{
  type: string
  char: AppSchema.Character
  edit: () => void
  delete: () => void
  download: () => void
  toggleFavorite: (value: boolean) => void
}> = (props) => {
  const [t] = useTransContext()

  return (
    <div class="bg-800 flex w-full flex-row items-center justify-between gap-4 rounded-xl px-2 py-1 hover:bg-[var(--bg-700)]">
      <A
        class="ellipsis flex h-3/4 grow cursor-pointer items-center gap-4"
        href={`/character/${props.char._id}/chats`}
        role="link"
        aria-label={t('open_chat_with_x', { name: props.char.name })}
      >
        <CharacterAvatar char={props.char} zoom={1.75} />
        <div class="flex max-w-full flex-col overflow-hidden">
          <span class="ellipsis font-bold">{props.char.name}</span>
          <span class="ellipsis">{props.char.description}</span>
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
  const [t] = useTransContext()

  const [listOpts, setListOpts] = createSignal(false)
  const nav = useNavigate()

  return (
    <div>
      <div class="hidden flex-row items-center justify-center gap-2 sm:flex">
        <Show when={props.char.favorite}>
          <a
            href="#"
            onClick={() => props.toggleFavorite(false)}
            role="button"
            aria-label={t('remove_x_from_favorite_characters', { name: props.char.name })}
          >
            <Star class="icon-button fill-[var(--text-900)] text-[var(--text-900)]" />
          </a>
        </Show>
        <Show when={!props.char.favorite}>
          <a
            href="#"
            onClick={() => props.toggleFavorite(true)}
            role="button"
            aria-label={t('add_x_to_favorite_characters', { name: props.char.name })}
          >
            <Star class="icon-button" />
          </a>
        </Show>
        <A
          href={`/chats/create/${props.char._id}`}
          role="button"
          aria-label={t('create_new_chat_with_x', { name: props.char.name })}
        >
          <MessageCircle class="icon-button" />
        </A>
        <a
          href="#"
          onClick={props.download}
          role="button"
          aria-label={t('download_character_x', { name: props.char.name })}
        >
          <Download class="icon-button" />
        </a>
        <a
          href="#"
          onClick={props.edit}
          role="button"
          aria-label={t('edit_character_x', { name: props.char.name })}
        >
          <Edit class="icon-button" />
        </a>
        <A
          href={`/character/create/${props.char._id}`}
          role="button"
          aria-label={t('duplicate_character_x', { name: props.char.name })}
        >
          <Copy class="icon-button" />
        </A>
        <a
          href="#"
          onClick={props.delete}
          role="button"
          aria-label={t('delete_character_x', { name: props.char.name })}
        >
          <Trash class="icon-button" />
        </a>
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
              <Star class="text-900 fill-[var(--text-900)]" /> {t('unfavorite')}
            </Show>
            <Show when={!props.char.favorite}>
              <Star /> {t('favorite')}
            </Show>
          </Button>
          <Button onClick={() => nav(`/chats/create/${props.char._id}`)} alignLeft size="sm">
            <MessageCircle /> {t('chat')}
          </Button>
          <Button alignLeft onClick={props.download} size="sm">
            <Download /> {t('download')}
          </Button>
          <Button alignLeft onClick={props.edit} size="sm">
            <Edit /> {t('edit')}
          </Button>
          <Button alignLeft onClick={() => nav(`/character/create/${props.char._id}`)} size="sm">
            <Copy /> {t('duplicate')}
          </Button>
          <Button alignLeft schema="red" onClick={props.delete} size="sm">
            <Trash /> {t('delete')}
          </Button>
        </div>
      </DropMenu>
    </div>
  )
}
