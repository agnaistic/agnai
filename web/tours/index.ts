import 'shepherd.js/dist/css/shepherd.css'
import homeTour from './home'
import charTour from './character'
import chatTour from './chat'
import { isLoggedIn } from '../store/api'
import { getStoredValue, setStoredValue } from '../shared/hooks'

export const tours = {
  home: homeTour,
  char: charTour,
  chat: chatTour,
}

export type TourType = keyof typeof tours

export function startTour(type: TourType, force?: boolean) {
  const tour = tours[type]
  if (!canStartTour(type, force)) return
  tour.start()
}

export function canStartTour(type: TourType, force?: boolean) {
  const tour = tours[type]
  const isComplete = getStoredValue(`tour-${type}`, false)
  const forceTours = force || getStoredValue(`force-tours`, false)

  if (isLoggedIn() && !forceTours) return false
  if (isComplete && !force) return false
  if (tour.isActive()) return false

  return true
}

export function clearTours() {
  for (const key in tours) {
    setStoredValue(`tour-${key}`, false)
    setStoredValue('force-tours', true)
  }
}
