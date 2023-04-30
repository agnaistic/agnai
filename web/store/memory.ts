import { AppSchema, NewBook } from '../../srv/db/schema'
import { EVENTS, events } from '../emitter'
import { createStore } from './create'
import { memoryApi } from './data/memory'
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

const initState: MemoryState = {
  creating: false,
  show: true,
  books: { loaded: false, list: [] },
  loadingAll: false,
  updating: false,
}

export const memoryStore = createStore<MemoryState>(
  'memory',
  initState
)((get, set) => {
  events.on(EVENTS.loggedOut, () => {
    memoryStore.setState(initState)
  })

  events.on(EVENTS.init, (init) => {
    memoryStore.setState({ books: { loaded: true, list: init.books } })
  })

  return {
    toggle(_, show: boolean) {
      return { show }
    },
    async *getAll({ books: prev, loadingAll }) {
      if (loadingAll) return

      yield { loadingAll: true, books: { loaded: false, list: [] } }
      const res = await memoryApi.getBooks()
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
      const res = await memoryApi.createBook(book)
      yield { creating: false }
      if (res.error) {
        toastStore.error(`Could not create memory book: ${res.error}`)
      }

      if (res.result) {
        yield { books: { ...books, list: books.list.concat(res.result) } }
        toastStore.success('Created memory book')
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
      const res = await memoryApi.updateBook(bookId, update)
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

    async *remove({ books: { list: prev } }, bookId: string, onSuccess?: Function) {
      const res = await memoryApi.removeBook(bookId)

      if (res.error) {
        toastStore.error(`Failed to remove book: ${res.error}`)
      }

      if (res.result) {
        const next = prev.filter((book) => book._id !== bookId)
        yield { books: { list: next, loaded: true } }
        toastStore.success('Book deleted')
        onSuccess?.()
      }
    },
  }
})
