import Shepherd from 'shepherd.js'

export function tourTitle(text: string, cancel: string) {
  return `
  <div class="flex justify-between pb-1">
    <div class="font-bold text-hl-500 pb-1">
      ${text}
    </div>
    <button class="shepherd-cancel-icon" aria-label="Close Tour" onclick="${cancel}()">×</button>
  </div>`
}

export const btn = {
  next: (tour: Shepherd.Tour, action?: () => void) => {
    return {
      text: 'Next',
      classes: 'btn btn-primary',
      action() {
        action?.()
        tour.next()
      },
    }
  },
  prev: (tour: Shepherd.Tour, action?: () => void) => {
    return {
      text: 'Back',
      classes: 'btn btn-primary',
      action() {
        action?.()
        tour.back()
      },
    }
  },
  done: (tour: Shepherd.Tour, action?: () => void) => {
    return {
      text: 'Done',
      classes: 'btn btn-primary',
      action() {
        action?.()
        tour.complete()
      },
    }
  },
}
