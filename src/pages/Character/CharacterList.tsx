import { Component, createEffect, For, Show } from 'solid-js'
import Button from '../../shared/Button'
import PageHeader from '../../shared/PageHeader'
import { Edit, Plus, Trash } from 'lucide-solid'
import { AppSchema } from '../../../server/db/schema'
import { chatStore } from '../../store'
import { A } from '@solidjs/router'
import AvatarIcon from '../../shared/AvatarIcon'

const CharacterList: Component = () => {
  const chars = chatStore()

  createEffect(() => {
    if (!chars.characters.loaded) {
      chatStore.getCharacters()
    }
  })

  return (
    <>
      <PageHeader title="Characters" subtitle="" />

      <Show when={!chars.characters.loaded}>
        <div>Loading...</div>
      </Show>
      <Show when={chars.characters.loaded}>
        <div class="flex w-full flex-col gap-2">
          <div class="flex w-full justify-end">
            <A href="/character/create">
              <Button>
                <Plus />
                Character
              </Button>
            </A>
          </div>
          <For each={chars.characters.list}>{(char) => <Character character={char} />}</For>
        </div>
        {chars.characters.list.length === 0 ? <NoCharacters /> : null}
      </Show>
    </>
  )
}

const Character: Component<{ character: AppSchema.Character }> = ({ character }) => {
  return (
    <div class="flex h-16 w-full flex-row items-center gap-4 rounded-xl bg-gray-900">
      <A
        class="ml-4 flex h-3/4 w-10/12 cursor-pointer items-center rounded-xl bg-gray-800"
        href={`/character/${character._id}/chats`}
      >
        <AvatarIcon avatarUrl={character.avatar} />
        <div class="">{character.name}</div>
      </A>
      <div class="flex w-2/12 flex-row justify-center gap-2">
        <Edit class="cursor-pointer" />
        <Trash class="cursor-pointer" />
      </div>
    </div>
  )
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
