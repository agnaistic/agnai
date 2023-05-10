import { Component, For, Show } from 'solid-js'
import { ChubItem } from './ChubItem'
import { chubStore } from '../../store/chub'
import ChubNavigation from './ChubNavigation'

const BookList: Component = () => {
  const books = chubStore((s) => s.books)

  return (
    <>
      <ChubNavigation buttons={books.length >= 48} />
      <div class="grid w-full grid-cols-[repeat(auto-fit,minmax(105px,1fr))] flex-row flex-wrap justify-start gap-2 py-2">
        <For each={books}>
          {(book) => (
            <ChubItem
              name={book.name}
              fullPath={book.fullPath}
              avatar={`https://avatars.charhub.io/avatars/${book.fullPath}/avatar.webp`}
              book={true}
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
