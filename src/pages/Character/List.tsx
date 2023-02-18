import { Component, For } from 'solid-js'
import Button from '../../shared/Button'
import PageHeader from '../../shared/PageHeader'
import { Edit, Plus, Trash } from 'lucide-solid'
import { AppSchema } from '../../../server/db/schema'
import { chatStore } from '../../store'
import { A } from '@solidjs/router'

const CharacterList: Component = () => {
  const chars = chatStore()

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
      </div>
      {chars.characters.length === 0 ? <NoCharacters /> : null}
      <For each={chars.characters}>{(char) => <Character character={char} />}</For>
    </>
  )
}

const Character: Component<{ character: AppSchema.Character }> = ({ character }) => {
  return (
    <div class="flex h-16 w-full flex-row items-center rounded-xl bg-gray-900">
      <div class="flex w-16 items-center justify-center">
        <AvatarIcon avatarUrl={character.avatarUrl} />
      </div>
      <div class="mx-4 w-full">{character.name}</div>
      <div class="flex w-32 flex-row gap-2">
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
    return <img class="h-8 w-8 rounded-full" src={avatarUrl} />
  }

  return <div class="w- h-8 rounded-full bg-slate-700"></div>
}

export default CharacterList
