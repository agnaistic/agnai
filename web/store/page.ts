import { canUsePane, isMobile } from '../shared/hooks'
import { createStore } from './create'

export type PageState = {
  showMenu: boolean
  showOverlay: boolean
}

export const pageStore = createStore<PageState>('page', {
  showMenu: isMobile() || location.search.includes('callback=') ? false : true,
  showOverlay: false,
})(() => {
  return {
    menu({ showMenu }, next?: boolean) {
      return { showMenu: next ?? !showMenu, overlay: next ?? !showMenu }
    },
    closeMenu: () => {
      if (canUsePane()) return
      return { showMenu: false, overlay: false }
    },
    toggleOverlay({ showOverlay }, next?: boolean) {
      return { showOverlay: next === undefined ? !showOverlay : next }
    },
  }
})
