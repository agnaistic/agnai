import { useNavigate, useParams } from '@solidjs/router'
import PageHeader from '../../shared/PageHeader'
import { setComponentPageTitle } from '../../shared/util'
import { memoryStore } from '../../store'
import { Show, createEffect, createSignal } from 'solid-js'
import { AppSchema } from '../../../common/types/schema'
import EditMemoryForm, { EntrySort } from './EditMemory'
import { Option } from '../../shared/Select'
import Button from '../../shared/Button'
import { FormLabel } from '../../shared/FormLabel'
import { Save } from 'lucide-solid'
import { emptyBookWithEmptyEntry } from '/common/memory'
import { Trans, useTransContext } from '@mbarzda/solid-i18next'

const EditMemoryPage = () => {
  const [t] = useTransContext()

  const { updateTitle } = setComponentPageTitle(t('memory_book'))
  let ref: any
  const nav = useNavigate()
  const params = useParams()
  const state = memoryStore()
  const [editing, setEditing] = createSignal<AppSchema.MemoryBook>()
  const [entrySort, setEntrySort] = createSignal<EntrySort>('creationDate')
  const updateEntrySort = (item: Option<string>) => {
    if (item.value === 'creationDate' || item.value === 'alpha') {
      setEntrySort(item.value)
    }
  }

  createEffect(() => {
    if (params.id === 'new') {
      updateTitle(t('create_memory_book'))
      setEditing(emptyBookWithEmptyEntry(t))
      return
    }

    const match = state.books.list.find((m) => m._id === params.id)
    if (match) {
      updateTitle(t('edit_x', { name: match.name }))
      setEditing(match)
    }
  })

  const saveBook = (ev: Event) => {
    ev.preventDefault()
    // Why do we set the sort to creationDate before saving, then restore the
    // previous sort? Two reasons:
    // - Creation date is not actually saved in the DB
    // - When saving the memory book, the data is taken from the DOM
    // (This should ideally be improved in a future patch)
    // Therefore every time we save the memory book we have to ensure the DOM
    // has the entries in creation order, for now.
    const oldEntrySort = entrySort()
    setEntrySort('creationDate')
    const body = editing()
    if (!params.id || !body) return

    if (params.id === 'new') {
      memoryStore.create(body, (book) => {
        setEditing(book)
        nav(`/memory/${book._id}`)
      })
    } else {
      memoryStore.update(params.id, body)
    }
    setEntrySort(oldEntrySort)
  }

  return (
    <>
      <PageHeader title={t('edit_memory_book')} />
      <Show when={!!editing()}>
        <form ref={ref} onSubmit={saveBook}>
          <div class="mt-4 flex justify-end">
            <Button type="submit">
              <Save />
              {!editing()?._id ? t('create_book') : t('update_book')}
            </Button>
          </div>
          <EditMemoryForm
            book={editing()!}
            entrySort={entrySort()}
            updateEntrySort={updateEntrySort}
            onChange={setEditing}
          />
          <div class="mt-4 flex justify-end">
            <Button type="submit">
              <Save />
              {!editing()?._id ? t('create_book') : t('update_book')}
            </Button>
          </div>

          <div class="mt-8 flex flex-col">
            <div class="flex flex-col gap-2">
              <div class="text-lg font-bold">{t('definitions')}</div>
              <FormLabel
                fieldName="priorty"
                label={t('priority')}
                helperText={t('priority_message')}
              />

              <FormLabel fieldName="weight" label={t('weight')} helperText={t('weight_message')} />

              <FormLabel
                fieldName="keywords"
                label={t('keywords')}
                helperText={
                  <Trans key="memory_keywords_message">
                    These are the terms that trigger the entry to be potentially included in the
                    prompt. You can use <code>{'{{char}}'}</code> and <code>{'{{user}}'}</code>
                    placeholders here.
                  </Trans>
                }
              />

              <FormLabel
                fieldName="entry"
                label={t('entry')}
                helperText={
                  <Trans key="entry_message">
                    This is the text that will be included in the prompt. You can use
                    <code>{'{{char}}'}</code> and <code>{'{{user}}'}</code> placeholders here.
                  </Trans>
                }
              />
            </div>
          </div>
        </form>
      </Show>
    </>
  )
}

export default EditMemoryPage
