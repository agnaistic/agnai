import { A } from '@solidjs/router'
import { Plus, Trash } from 'lucide-solid'
import { Component, createEffect, For, Show } from 'solid-js'
import { AppSchema } from '../../../srv/db/schema'
import Button from '../../shared/Button'
import PageHeader from '../../shared/PageHeader'
import { memoryStore } from '../../store'

const MemoryPage: Component = () => {
  const state = memoryStore()

  const removeBook = (book: AppSchema.MemoryBook) => {
    memoryStore.remove(book._id)
  }

  return (
    <>
      <PageHeader
        title="Memory Library"
        subtitle={
          <>
            {' '}
            <a
              href="https://github.com/luminai-companion/agn-ai/blob/dev/instructions/memory.md"
              target="_blank"
              class="link"
            >
              Memory Book Guide
            </a>
          </>
        }
      />
      <div class="flex w-full justify-end">
        <A href="/memory/new">
          <Button>
            <Plus />
            Create Book
          </Button>
        </A>
      </div>

      <Show when={!state.books.list.length}>
        <NoBooks />
      </Show>

      <Show when={state.books.list.length}>
        <For each={state.books.list}>
          {(book) => (
            <div class="mt-2 flex w-full items-center gap-4">
              <A
                href={`/memory/${book._id}`}
                class="flex h-12 w-full cursor-pointer items-center gap-2 rounded-xl bg-[var(--bg-800)] px-4 hover:bg-[var(--bg-700)]"
              >
                {book.name}
              </A>

              <div class="icon-button" onClick={() => removeBook(book)}>
                <Trash />
              </div>
            </div>
          )}
        </For>
      </Show>

      <div class="flex flex-col items-center"></div>
    </>
  )
}

export default MemoryPage

const NoBooks = () => (
  <div class="flex justify-center">You have no memory books yet. Click Create to get started.</div>
)
