import { Component, createEffect, For } from 'solid-js'
import Button from '../../shared/Button'
import PageHeader from '../../shared/PageHeader'
import { Edit, Plus, Trash } from 'lucide-solid'
import { AppSchema } from '../../../server/db/schema'
import { chatStore } from '../../store'
import { A } from '@solidjs/router'

const CharacterList: Component = () => {
  const chars = chatStore()

  createEffect(() => {
    if (!chars.characters.length) {
      chatStore.getCharacters()
    }
  })

  return (
    <>
      <PageHeader title="Characters" subtitle="" />

      <div class="flex w-full flex-col gap-2">
        <div class="flex w-full justify-end">
          <A href="/character/create">
            <Button>
              <Plus />
              Character
            </Button>
          </A>
        </div>
        <For each={chars.characters}>{(char) => <Character character={char} />}</For>
      </div>
      {chars.characters.length === 0 ? <NoCharacters /> : null}
    </>
  )
}

const Character: Component<{ character: AppSchema.Character }> = ({ character }) => {
  return (
    <div class="flex h-16 w-full flex-row items-center gap-4 rounded-xl bg-gray-900">
      <A
        class="ml-4 flex h-3/4 w-10/12 cursor-pointer items-center rounded-xl bg-gray-800"
        href={`/character/detail/${character._id}`}
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

const AvatarIcon: Component<{ avatarUrl?: string }> = ({ avatarUrl }) => {
  if (avatarUrl) {
    return <img class="mx-2 h-8 w-8 rounded-full" src={avatarUrl} />
  }

  return <div class="w- mx-2 h-8 rounded-full bg-slate-700"></div>
}

export default CharacterList
