import { Component, For, Show } from 'solid-js'
import { ChubItem } from './ChubItem'
import { chubStore } from '../../store/chub'
import ChubNavigation, { chubPage } from './ChubNavigation'

const CharList: Component = () => {
  const chars = chubStore((s) => s.chars)

  return (
    <>
      <ChubNavigation buttons={chars.length >= 48} />
      <div class="grid w-full grid-cols-[repeat(auto-fit,minmax(105px,1fr))] flex-row flex-wrap justify-start gap-2 py-2">
        <For each={chars.slice(48 * (chubPage() - 1))}>
          {(char) => (
            <ChubItem
              name={char.name}
              fullPath={char.fullPath}
              avatar={
                `https://avatars.charhub.io/avatars/${char.fullPath}/avatar.webp` ||
                `https://git.chub.ai/${char.fullPath}/-/raw/main/avatar.webp`
              }
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
