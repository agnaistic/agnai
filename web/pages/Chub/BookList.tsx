import { Component, For, Show } from 'solid-js'
import { ChubItem } from './ChubItem'
import { chubStore } from '../../store/chub'
import ChubNavigation from './ChubNavigation'
import { AppSchema } from '/common/types'
import Loading from '/web/shared/Loading'

const BookList: Component<{
  setBook: (book: AppSchema.MemoryBook, fullPath: string) => void
}> = (props) => {
  const state = chubStore()

  return (
    <>
      <ChubNavigation buttons={state.books.length >= 48} />
      <Show when={state.booksLoading}>
        <div class="flex w-full justify-center">
          <Loading />
        </div>
      </Show>
      <div class="grid w-full grid-cols-[repeat(auto-fit,minmax(105px,1fr))] flex-row flex-wrap justify-start gap-2 py-2">
        <For each={state.books}>
          {(book) => (
            <ChubItem
              entity={book}
              name={book.name}
              fullPath={book.fullPath}
              avatar={`https://avatars.charhub.io/avatars/${book.fullPath}/avatar.webp`}
              book={true}
              setBook={props.setBook}
              description={book.tagline || book.description}
            />
          )}
        </For>
        <Show when={state.books.length < 4}>
          <For each={new Array(4 - state.books.length)}>{() => <div></div>}</For>
        </Show>
      </div>
    </>
  )
}

export default BookList
