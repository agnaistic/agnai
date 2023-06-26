import { JSX } from 'solid-js'
import { createStore } from './create'

export type RootModal = { id: string; element: JSX.Element }

export type RootModalState = {
  modals: RootModal[]
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
    }
  }
)
