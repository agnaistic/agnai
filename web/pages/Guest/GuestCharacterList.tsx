import { Component, createSignal, For } from 'solid-js'
import Button from '../../shared/Button'
import PageHeader from '../../shared/PageHeader'
import { Copy, Download, Edit, Import, Plus, Trash } from 'lucide-solid'
import { A } from '@solidjs/router'
import AvatarIcon from '../../shared/AvatarIcon'
import { GuestCharacter, guestStore } from '../../store'
import ImportCharacterModal, { ImportCharacter } from '../Character/ImportCharacter'
import DeleteCharacterModal from '../Character/DeleteCharacter'

const GuestCharacterList: Component = () => {
  const state = guestStore()
  const [showImport, setImport] = createSignal(false)
  const [showDelete, setDelete] = createSignal<GuestCharacter>()

  const onImport = (char: ImportCharacter) => {
    guestStore.createCharacter(char)
    setImport(false)
  }

  return (
    <>
      <PageHeader title="Characters" subtitle="" />

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
        <For each={state.chars}>
          {(char) => <Character character={char} delete={() => setDelete(char)} />}
        </For>
      </div>
      {state.chars.length === 0 ? <NoCharacters /> : null}
      <ImportCharacterModal show={showImport()} close={() => setImport(false)} onSave={onImport} />
      <DeleteCharacterModal
        char={showDelete()}
        show={!!showDelete()}
        close={() => setDelete(undefined)}
        onDelete={(id) => guestStore.deleteCharacter(id)}
      />
    </>
  )
}

const Character: Component<{ character: GuestCharacter; delete: () => void }> = (props) => {
  return (
    <div class="flex w-full gap-2">
      <div class="flex h-12 w-full flex-row items-center gap-4 rounded-xl bg-[var(--bg-800)]">
        <A
          class="ml-4 flex h-3/4 cursor-pointer items-center rounded-2xl  sm:w-9/12"
          href={`/guest/character/${props.character._id}/chats`}
        >
          <AvatarIcon avatarUrl={props.character.avatar} class="mx-4 h-10 w-10 rounded-md" />
          <div class="text-lg font-bold">{props.character.name}</div>
        </A>
      </div>
      <div class="flex flex-row items-center justify-center gap-2 sm:w-3/12">
        <a
          href={`data:text/json:charset=utf-8,${encodeURIComponent(charToJson(props.character))}`}
          download={`${props.character.name}.json`}
        >
          <Download class="cursor-pointer text-white/25 hover:text-white" />
        </a>
        <A href={`/guest/character/${props.character._id}/edit`}>
          <Edit class="cursor-pointer text-white/25 hover:text-white" />
        </A>

        <A href={`/guest/character/create/${props.character._id}`}>
          <Copy class="cursor-pointer text-white/25 hover:text-white" />
        </A>

        <Trash class="cursor-pointer text-white/25 hover:text-white" onClick={props.delete} />
      </div>
    </div>
  )
}

function charToJson(char: GuestCharacter) {
  const { _id, avatar, ...json } = char
  return JSON.stringify(json, null, 2)
}

const NoCharacters: Component = () => (
  <div class="mt-16 flex w-full justify-center rounded-full text-xl">
    You have no characters!&nbsp;
    <A class="text-[var(--hl-500)]" href="/character/create">
      Create a character
    </A>
    &nbsp;to get started!
  </div>
)

export default GuestCharacterList
