import { Component, createEffect, createSignal, For, Show } from 'solid-js'
import Button from '../../shared/Button'
import PageHeader from '../../shared/PageHeader'
import { Copy, Download, Edit, Import, Plus, Trash } from 'lucide-solid'
import { AppSchema } from '../../../srv/db/schema'
import { chatStore } from '../../store'
import { A } from '@solidjs/router'
import AvatarIcon from '../../shared/AvatarIcon'
import { characterStore } from '../../store'
import ImportCharacterModal from './ImportCharacter'
import DeleteCharacterModal from './DeleteCharacter'

const CharacterList: Component = () => {
  const chars = characterStore((s) => s.characters)
  const [showImport, setImport] = createSignal(false)
  const [showDelete, setDelete] = createSignal<AppSchema.Character>()

  createEffect(() => {
    characterStore.getCharacters()
  })

  return (
    <>
      <PageHeader title="Characters" subtitle="" />

      <Show when={!chars.loaded}>
        <div>Loading...</div>
      </Show>
      <Show when={chars.loaded}>
        <div class="flex w-full flex-col gap-2">
          <div class="flex w-full justify-end gap-2">
            <Button onClick={() => setImport(true)}>
              <Import />
              Import
            </Button>
            <A href="/character/create">
              <Button>
                <Plus />
                Character
              </Button>
            </A>
          </div>
          <For each={chars.list}>
            {(char) => <Character character={char} delete={() => setDelete(char)} />}
          </For>
        </div>
        {chars.list.length === 0 ? <NoCharacters /> : null}
      </Show>
      <ImportCharacterModal show={showImport()} close={() => setImport(false)} />
      <DeleteCharacterModal
        char={showDelete()}
        show={!!showDelete()}
        close={() => setDelete(undefined)}
      />
    </>
  )
}

const Character: Component<{ character: AppSchema.Character; delete: () => void }> = (props) => {
  return (
    <div class="flex h-16 w-full flex-row items-center gap-4 rounded-xl bg-gray-900">
      <A
        class="ml-4 flex h-3/4 w-10/12 cursor-pointer items-center rounded-xl bg-gray-800"
        href={`/character/${props.character._id}/chats`}
      >
        <AvatarIcon avatarUrl={props.character.avatar} />
        <div class="">{props.character.name}</div>
      </A>
      <div class="flex w-2/12 flex-row justify-center gap-2">
        <a
          href={`data:text/json:charset=utf-8,${encodeURIComponent(charToJson(props.character))}`}
          download={`${props.character.name}.json`}
        >
          <Download class="cursor-pointer text-white/25 hover:text-white" />
        </a>
        <A href={`/character/${props.character._id}/edit`}>
          <Edit class="cursor-pointer text-white/25 hover:text-white" />
        </A>

        <A href={`/character/create/${props.character._id}`}>
          <Copy class="cursor-pointer text-white/25 hover:text-white" />
        </A>

        <Trash class="cursor-pointer text-white/25 hover:text-white" onClick={props.delete} />
      </div>
    </div>
  )
}

function charToJson(char: AppSchema.Character) {
  const { _id, updatedAt, createdAt, kind, avatar, ...json } = char
  return JSON.stringify(json, null, 2)
}

const NoCharacters: Component = () => (
  <div class="mt-16 flex w-full justify-center rounded-full text-xl">
    You have no characters!&nbsp;
    <A class="text-purple-500" href="/character/create">
      Create a character
    </A>
    &nbsp;to get started!
  </div>
)

export default CharacterList
