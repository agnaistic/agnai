import Shepherd from 'shepherd.js'
import { setStoredValue } from '../shared/hooks'
import { tourTitle } from './util'

export { profileTour as default }

const profileTour = new Shepherd.Tour({
  useModalOverlay: true,

  defaultStepOptions: {
    scrollTo: true,
    classes: 'bg-800',
  },
})

const win: any = window
win.profileTourCancel = () => {
  profileTour.cancel()
  setStoredValue('tour-profile', true)
}

const title = (text: string) => tourTitle(text, 'profileTourCancel')

profileTour.addSteps([
  {
    id: 'tour-handle',
    text: `${title(
      'Your Profile'
    )} Set your display name before chatting for a more personalized chat.`,
    attachTo: {
      element: '.tour-displayname',
      on: 'top',
    },
    buttons: [
      {
        text: 'Done',
        classes: 'btn btn-primary',
        action: profileTour.complete,
      },
    ],
  },
])
