import { Component, For, Show } from 'solid-js'
import { ChubItem } from './ChubItem'
import { chubStore } from '../../store/chub'
import ChubNavigation from './ChubNavigation'
import type { NewCharacter } from '/web/store/character'
import Loading from '/web/shared/Loading'

const CharList: Component<{
  loading: () => void
  setChar: (char: NewCharacter, fullPath: string) => void
}> = (props) => {
  const state = chubStore()

  return (
    <>
      <ChubNavigation buttons={state.chars.length >= 48} />
      <Show when={state.charsLoading}>
        <div class="flex w-full justify-center">
          <Loading />
        </div>
      </Show>
      <div class="grid w-full grid-cols-[repeat(auto-fit,minmax(160px,1fr))] flex-row flex-wrap justify-start gap-2 py-2">
        <For each={state.chars.slice(48 * (state.page - 1))}>
          {(char) => (
            <ChubItem
              entity={char}
              loading={props.loading}
              name={char.name}
              fullPath={char.fullPath}
              description={char.tagline || char.description}
              avatar={
                `https://avatars.charhub.io/avatars/${char.fullPath}/avatar.webp` ||
                `https://git.chub.ai/${char.fullPath}/-/raw/main/avatar.webp`
              }
              setChar={props.setChar}
            />
          )}
        </For>
        <Show when={state.chars.length < 4}>
          <For each={new Array(4 - state.chars.length)}>{() => <div></div>}</For>
        </Show>
      </div>
    </>
  )
}

export default CharList
