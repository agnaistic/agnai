import { Component, For, Show, createEffect, createMemo, createSignal } from 'solid-js'
import { ChubChar } from './ChubChar'
import { chubStore } from '../../store/chub'
import TextInput from '../../shared/TextInput'
import { chubOptions } from './Chub'

const BookList: Component = () => {
  createEffect(() => {
    chubStore.getChubBooks()
  })

  const books = createMemo(() => {
    return chubStore().books
  })

  return (
    <>
      <div class="m-1 mb-2 ml-0 mr-1 flex flex-wrap justify-between">
        <TextInput
          fieldName="search"
          placeholder="Search by name..."
          onKeyUp={(ev) => {
            chubOptions.search = ev.currentTarget.value
            chubStore.getChubBooks()
          }}
        />
      </div>
      <div class="grid w-full grid-cols-[repeat(auto-fit,minmax(105px,1fr))] flex-row flex-wrap justify-start gap-2 py-2">
        <For each={books()}>
          {(book) => (
            <ChubChar
              name={book.name}
              avatar={`https://git.characterhub.org/${book.fullPath}/-/raw/main/avatar.webp`}
            />
          )}
        </For>
        <Show when={books.length < 4}>
          <For each={new Array(4 - books.length)}>{() => <div></div>}</For>
        </Show>
      </div>
    </>
  )
}

export default BookList
