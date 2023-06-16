import { JSX } from 'solid-js'
import { createStore } from './create'

export type RootModalType = 'memoryBook'

export type RootModal = { type: RootModalType; element: JSX.Element }

export type RootModalState = {
  modals: RootModal[]
}

export const rootModalStore = createStore<RootModalState>('root-modal', { modals: [] })(
  (get, set) => {
    return {
      addModal: ({}, modal: RootModal) => {
        const { modals } = get()
        return { modals: [...modals.filter((m) => m.type !== modal.type), modal] }
      },
      removeModal: ({}, modalType: RootModalType) => {
        const { modals } = get()
        return { modals: [...modals.filter((m) => m.type !== modalType)] }
      },
    }
  }
)
