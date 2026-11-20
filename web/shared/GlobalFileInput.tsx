import { Component, createEffect, onCleanup, onMount } from 'solid-js'
import { getFileAsDataURL } from './FileInput'
import { getStore } from '../store/create'

export const GlobalFileInput: Component = () => {
  let ref: HTMLInputElement

  const state = getStore('page')((s) => ({ attach: s.attach }))

  createEffect(() => {
    if (!state.attach) return
    ref?.click()
  })

  const onChange = async (list: FileList | null) => {
    getStore('page').closeAttach()
    if (!list?.length) {
      state.attach?.callback([])
      return
    }

    const files = await Promise.all(Array.from(list).map(getFileAsDataURL))
    state.attach?.callback(files)
  }

  const onCancel = (ev: any) => {
    if (ev.target?.id !== 'global-file-input') return
    getStore('page').closeAttach()
  }

  onMount(() => document.addEventListener('cancel', onCancel))
  onCleanup(() => document.removeEventListener('cancel', onCancel))

  return (
    <>
      <input
        id="global-file-input"
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
