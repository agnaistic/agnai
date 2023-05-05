import { Component, createEffect } from 'solid-js'
import { chubStore } from '../../store/chub'
import { chubOptions } from './Chub'
import TextInput from '../../shared/TextInput'
import Button from '../../shared/Button'
import { ArrowLeft, ArrowRight } from 'lucide-solid'

const ChubNavigation: Component = () => {
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
          <Button
            schema="secondary"
            class="rounded-xl"
            onClick={() => {
              console.log('LEFT')
            }}
          >
            <ArrowLeft />
          </Button>
          <Button
            schema="secondary"
            class="rounded-xl"
            onClick={() => {
              console.log('RIGHT')
            }}
          >
            <ArrowRight />
          </Button>
        </div>
      </div>
    </>
  )
}

export default ChubNavigation
