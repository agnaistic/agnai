import { JSX } from 'solid-js'
import { createStore } from './create'

export type RootModal = { id: string; element: JSX.Element }

export type RootModalState = {
  modals: RootModal[]
  info?: any
}

export const rootModalStore = createStore<RootModalState>('root-modal', { modals: [] })(
  (get, set) => {
    return {
      addModal: ({}, modal: RootModal) => {
        const { modals } = get()
        return { modals: [...modals.filter((m) => m.id !== modal.id), modal] }
      },
      removeModal: ({}, modalType: string) => {
        const { modals } = get()
        return { modals: [...modals.filter((m) => m.id !== modalType)] }
      },

      info(_, content?: JSX.Element | string) {
        if (!content) return { info: undefined }
        return { info: content }
      },
    }
  }
)
