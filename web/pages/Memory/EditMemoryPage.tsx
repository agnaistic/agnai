import { useNavigate, useParams } from '@solidjs/router'
import PageHeader from '../../shared/PageHeader'
import { setComponentPageTitle } from '../../shared/util'
import { memoryStore } from '../../store'
import { createSignal, onMount } from 'solid-js'
import { AppSchema } from '../../../common/types/schema'
import EditMemoryForm, { EntrySort } from './EditMemory'
import { Option } from '../../shared/Select'
import Button from '../../shared/Button'
import { FormLabel } from '../../shared/FormLabel'
import { Save } from 'lucide-solid'
import { emptyBookWithEmptyEntry } from '/common/memory'
import { Page } from '/web/Layout'
import { createStore } from 'solid-js/store'

const EditMemoryPage = () => {
  const { updateTitle } = setComponentPageTitle('Memory book')
  const nav = useNavigate()
  const params = useParams()
  const books = memoryStore()
  const [state, setState] = createStore<AppSchema.MemoryBook>(emptyBookWithEmptyEntry())
  const [entrySort, setEntrySort] = createSignal<EntrySort>('creationDate')
  const updateEntrySort = (item: Option<string>) => {
    if (item.value === 'creationDate' || item.value === 'alpha') {
      setEntrySort(item.value)
    }
  }

  onMount(() => {
    if (params.id === 'new') {
      updateTitle('Create memory book')
      setState(emptyBookWithEmptyEntry())
      return
    }

    const match = books.books.list.find((m) => m._id === params.id)
    if (match) {
      updateTitle(`Edit ${match.name}`)
      setState(match)
    }
  })

  const saveBook = () => {
    // Why do we set the sort to creationDate before saving, then restore the
    // previous sort? Two reasons:
    // - Creation date is not actually saved in the DB
    // - When saving the memory book, the data is taken from the DOM
    // (This should ideally be improved in a future patch)
    // Therefore every time we save the memory book we have to ensure the DOM
    // has the entries in creation order, for now.
    const oldEntrySort = entrySort()
    setEntrySort('creationDate')
    if (!params.id) return

    if (params.id === 'new') {
      memoryStore.create(state, (book) => {
        setState(book)
        nav(`/memory/${book._id}`)
      })
    } else {
      memoryStore.update(params.id, state)
    }
    setEntrySort(oldEntrySort)
  }

  return (
    <Page>
      <PageHeader title="Edit Memory Book" />

      <div class="mt-4 flex justify-end">
        <Button onClick={saveBook}>
          <Save />
          {!state._id ? 'Create Book' : 'Update Book'}
        </Button>
      </div>
      <EditMemoryForm
        state={state}
        entrySort={entrySort()}
        updateEntrySort={updateEntrySort}
        setter={setState}
      />
      <div class="mt-4 flex justify-end">
        <Button onClick={saveBook}>
          <Save />
          {!state._id ? 'Create Book' : 'Update Book'}
        </Button>
      </div>

      <div class="mt-8 flex flex-col">
        <div class="flex flex-col gap-2">
          <div class="text-lg font-bold">Definitions</div>
          <FormLabel
            fieldName="priorty"
            label="Priority"
            helperText="When deciding which entries to INCLUDE in the prompt, the higher the priority entries win."
          />

          <FormLabel
            fieldName="weight"
            label="Weight"
            helperText="When deciding how to ORDER entries, the higher the weight the closer to the bottom."
          />

          <FormLabel
            fieldName="keywords"
            label="Keywords"
            helperText={
              <>
                These are the terms that trigger the entry to be potentially included in the prompt.
                You can use <code>{'{{char}}'}</code> and <code>{'{{user}}'}</code> placeholders
                here.
              </>
            }
          />

          <FormLabel
            fieldName="entry"
            label="Entry"
            helperText={
              <>
                This is the text that will be included in the prompt. You can use{' '}
                <code>{'{{char}}'}</code> and <code>{'{{user}}'}</code> placeholders here.
              </>
            }
          />
        </div>
      </div>
    </Page>
  )
}

export default EditMemoryPage
