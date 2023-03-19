import { AppSchema } from '../../srv/db/schema'
import { createStore } from './create'
import { data } from './data'
import { toastStore } from './toasts'

type MemoryState = {
  books: {
    loaded: boolean
    list: AppSchema.MemoryBook[]
  }
}

export const memoryStore = createStore<MemoryState>('memory', {
  books: { loaded: false, list: [] },
})((get, set) => {
  return {
    async *getAll({ books: prev }) {
      yield { books: { loaded: false, list: [] } }
      const res = await data.memory.getBooks()

      if (res.result) {
        yield { books: { loaded: true, list: res.result.books } }
      }

      if (res.error) {
        yield { books: prev }
        toastStore.error(`Failed to retrieve memory books: ${res.error}`)
      }
    },
  }
})
