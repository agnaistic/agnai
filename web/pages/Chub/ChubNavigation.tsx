import { Component, Show, createEffect, createSignal } from 'solid-js'
import { chubStore } from '../../store/chub'
import { chubOptions } from './Chub'
import TextInput from '../../shared/TextInput'
import Button from '../../shared/Button'
import { ArrowLeft, ArrowRight } from 'lucide-solid'
import { toastStore } from '../../store'

export const [chubPage, setChubPage] = createSignal<number>(1)

const ChubNavigation: Component<{ buttons: boolean }> = (props) => {
  createEffect(() => {
    chubStore.getChubChars()
  })

  return (
    <>
      <div class="mt-2 flex justify-between">
        <div class="flex gap-2">
          <TextInput
            fieldName="search"
            placeholder="Search by name..."
            onKeyUp={(ev) => {
              chubOptions.search = ev.currentTarget.value
              chubStore.getChubChars()
              chubStore.getChubBooks()
            }}
          />
          <Show when={props.buttons}>
            <Button
              schema="secondary"
              class="rounded-xl"
              onClick={() => {
                if (chubPage() > 1) {
                  setChubPage(chubPage() - 1)
                  chubStore.getChubChars()
                  chubStore.getChubBooks()
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
                  chubStore.getChubChars()
                  chubStore.getChubBooks()
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
                  chubStore.getChubChars()
                  chubStore.getChubBooks()
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
