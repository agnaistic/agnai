import { Component, For, Show, createEffect, createMemo, createSignal } from 'solid-js'
import { ChubChar } from './ChubChar'
import { chubStore } from '../../store/chub'
import ChubNavigation from './ChubNavigation'

const CharList: Component = () => {
  createEffect(() => {
    chubStore.getChubChars()
  })

  const chars = createMemo(() => {
    return chubStore().chars
  })

  return (
    <>
      <ChubNavigation />
      <div class="grid w-full grid-cols-[repeat(auto-fit,minmax(105px,1fr))] flex-row flex-wrap justify-start gap-2 py-2">
        <For each={chars()}>
          {(char) => (
            <ChubChar
              name={char.name}
              avatar={`https://avatars.charhub.io/avatars/${char.fullPath}/avatar.webp`}
            />
          )}
        </For>
        <Show when={chars.length < 4}>
          <For each={new Array(4 - chars.length)}>{() => <div></div>}</For>
        </Show>
      </div>
    </>
  )
}

export default CharList
