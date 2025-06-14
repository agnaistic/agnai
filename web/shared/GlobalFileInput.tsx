import { Component, createEffect } from 'solid-js'
import { getFileAsDataURL } from './FileInput'
import { getStore } from '../store/create'

export const GlobalFileInput: Component = () => {
  let ref: HTMLInputElement

  const state = getStore('settings')((s) => ({ attach: s.attach }))

  createEffect(() => {
    if (!state.attach) return

    ref?.click()
  })

  const onChange = async (list: FileList | null) => {
    if (!list?.length) {
      state.attach?.callback([])
      return
    }

    const files = await Promise.all(Array.from(list).map(getFileAsDataURL))
    state.attach?.callback(files)
  }

  return (
    <>
      <input
        class="hidden"
        ref={(ele) => {
          ref = ele
        }}
        multiple={state.attach?.multiple}
        type="file"
        accept={state.attach?.accept || '*/*'}
        onChange={(ev) => onChange(ev.currentTarget.files)}
      />
    </>
  )
}
