import { Component, Show, createSignal, onMount } from 'solid-js'
import { chubStore, getChubBooks, getChubChars } from '../../store/chub'
import TextInput from '../../shared/TextInput'
import Button from '../../shared/Button'
import { ArrowLeft, ArrowRight } from 'lucide-solid'
import { toastStore } from '../../store'

export const [chubPage, setChubPage] = createSignal<number>(1)

const ChubNavigation: Component<{ buttons: boolean }> = (props) => {
  const update = () => {
    getChubChars()
    getChubBooks()
  }

  onMount(() => {
    update()
  })

  const onSearch = (
    ev: KeyboardEvent & {
      target: Element
      currentTarget: HTMLInputElement | HTMLTextAreaElement
    }
  ) => {
    chubStore.setSearch(ev.currentTarget.value)
    update()
    setChubPage(1)
  }

  return (
    <>
      <div class="mt-2 flex justify-between">
        <div class="flex gap-2">
          <TextInput
            fieldName="search"
            placeholder="Search by name..."
            value={chubStore().search}
            onKeyUp={onSearch}
          />
          <Show when={props.buttons}>
            <Button
              schema="secondary"
              class="rounded-xl"
              onClick={() => {
                if (chubPage() > 1) {
                  setChubPage(chubPage() - 1)
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
              value={chubPage()}
              onKeyUp={(ev) => {
                try {
                  setChubPage(Number(ev.currentTarget.value))
                  update()
                } catch (error) {
                  toastStore.error('Not a valid page number.')
                }
              }}
            />
            <Button
              schema="secondary"
              class="rounded-xl"
              onClick={() => {
                if (chubStore().chars.length % 48 == 0) {
                  setChubPage(chubPage() + 1)
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
