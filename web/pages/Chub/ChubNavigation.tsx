import { Component, Show, onMount } from 'solid-js'
import { chubStore } from '../../store/chub'
import TextInput from '../../shared/TextInput'
import Button from '../../shared/Button'
import { ArrowLeft, ArrowRight } from 'lucide-solid'
import { toastStore } from '../../store'

const ChubNavigation: Component<{ buttons: boolean }> = (props) => {
  const state = chubStore()

  const update = () => {
    chubStore.getBooks()
    chubStore.getChars()
  }

  onMount(update)

  const onSearch = (
    ev: KeyboardEvent & {
      target: Element
      currentTarget: HTMLInputElement | HTMLTextAreaElement
    }
  ) => {
    chubStore.setSearch(ev.currentTarget.value)
    update()
    chubStore.setPage(1)
  }

  return (
    <>
      <div class="mt-2 flex justify-between">
        <div class="flex gap-2">
          <TextInput
            fieldName="search"
            placeholder="Search by name..."
            value={state.search}
            onKeyUp={onSearch}
          />
          <Show when={props.buttons}>
            <Button
              schema="secondary"
              class="rounded-xl"
              onClick={() => {
                if (state.page > 1) {
                  chubStore.setPage(state.page - 1)
                  update()
                } else {
                  toastStore.error('Already on first page!')
                }
              }}
            >
              <ArrowLeft />
            </Button>

            <TextInput
              fieldName="number"
              class="w-12"
              value={state.page}
              onKeyUp={(ev) => {
                const n = Number(ev.currentTarget.value)
                if (!isNaN(n) && n !== 0) {
                  chubStore.setPage(n)
                  update()
                } else {
                  toastStore.error('Not a valid page number.')
                }
              }}
            />
            <Button
              schema="secondary"
              class="rounded-xl"
              onClick={() => {
                if (state.chars.length % 48 == 0) {
                  chubStore.setPage(state.page + 1)
                  update()
                } else {
                  toastStore.error(`Already on last page!`)
                }
              }}
            >
              <ArrowRight />
            </Button>
          </Show>
        </div>
      </div>
    </>
  )
}

export default ChubNavigation
