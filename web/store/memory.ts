import { AppSchema, NewBook } from '../../srv/db/schema'
import { createStore } from './create'
import { data } from './data'
import { settingStore } from './settings'
import { toastStore } from './toasts'

type MemoryState = {
  show: boolean
  books: {
    loaded: boolean
    list: AppSchema.MemoryBook[]
  }
  creating: boolean
  loadingAll: boolean
  updating: boolean
}

export const memoryStore = createStore<MemoryState>('memory', {
  creating: false,
  show: true,
  books: { loaded: false, list: [] },
  loadingAll: false,
  updating: false,
})((get, set) => {
  settingStore.subscribe(({ init }, prev) => {
    if (init && !prev.init) {
      memoryStore.setState({ books: { list: init.books, loaded: true } })
    }
  })

  return {
    toggle(_, show: boolean) {
      return { show }
    },
    async *getAll({ books: prev, loadingAll }) {
      if (loadingAll || prev.loaded) return

      yield { loadingAll: true, books: { loaded: false, list: [] } }
      const res = await data.memory.getBooks()
      yield { loadingAll: false }
      if (res.result) {
        yield { books: { loaded: true, list: res.result.books } }
      }

      if (res.error) {
        yield { books: prev }
        toastStore.error(`Failed to retrieve memory books: ${res.error}`)
      }
    },

    async *create(
      { books, creating },
      book: NewBook,
      onSuccess?: (book: AppSchema.MemoryBook) => void
    ) {
      if (creating) return
      yield { creating: true }
      const res = await data.memory.createBook(book)
      yield { creating: false }
      if (res.error) {
        toastStore.error(`Could not create memory book: ${res.error}`)
      }

      if (res.result) {
        yield { books: { ...books, list: books.list.concat(res.result) } }
        onSuccess?.(res.result)
      }
    },

    async *reloadAll({ books: prev }) {
      yield { books: { list: prev.list, loaded: false } }
      memoryStore.getAll()
    },

    async *update({ books: { list: prev }, updating }, bookId: string, update: NewBook) {
      if (updating) return
      yield { updating: true }
      const res = await data.memory.updateBook(bookId, update)
      yield { updating: false }
      if (res.error) {
        toastStore.error(`Failed to update book: ${res.error}`)
      }

      if (res.result) {
        toastStore.success(`Book updated`)
        const next = prev.map((book) => (book._id === bookId ? { ...book, ...update } : book))
        yield { books: { list: next, loaded: true } }
      }
    },
  }
})
