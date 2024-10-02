import Shepherd from 'shepherd.js'
import { tourTitle } from './util'
import { getStore } from '../store/create'
import { isMobile, setStoredValue } from '../shared/hooks'
import { isLoggedIn } from '../store/api'

export { homeTour as default }

export const homeTour = new Shepherd.Tour({
  useModalOverlay: true,

  defaultStepOptions: {
    scrollTo: true,
    classes: 'bg-800',
  },
})

homeTour.on('cancel', onTourClose)
homeTour.on('complete', onTourClose)

function onTourClose() {
  const store = getStore('user')
  const { profile } = store.getState()
  if (profile?.handle === 'You') {
    store.modal(true)
  }
}

const win: any = window
win.homeTourCancel = () => {
  homeTour.cancel()
  setStoredValue('tour-home', true)
}

const menuSide = isMobile() ? 'bottom' : 'right'
const title = (text: string) => tourTitle(text, 'homeTourCancel')

const prev = {
  text: 'Back',
  classes: 'btn btn-primary',
  action: homeTour.back,
}

const next = {
  text: 'Next',
  classes: 'btn btn-primary',
  action: homeTour.next,
}

homeTour.addSteps([
  {
    id: 'tour-welcome',
    text: `${title(
      'Welcome to Agnai'
    )} Agnai allows you to chat with fictional characters using AI.<br />You can chat completely for free with no limits or restrictions. <br />You can subscribe to access for smarter models, image generation, and other features.`,
    buttons: [next],
  },
])

if (!isLoggedIn()) {
  homeTour.addStep({
    id: 'tour-register',
    text: `${title(
      'Guest Mode'
    )}You are currently in guest mode. Your data is saved in your browser.<br />You can register to save your data and access your data from multiple devices.`,
    attachTo: {
      element: '.tour-register',
      on: menuSide,
    },
    buttons: [prev, next],
  })
}

homeTour.addSteps([
  {
    id: 'tour-user-profile',
    text: `<p class="font-bold text-hl-500 pb-1">Set up your Profile</p> You can change your handle and avatar.<br />You can use the <code>Persona</code> button to impersonate a character and use their persona.`,
    attachTo: {
      element: '.tour-user-profile',
      on: menuSide,
    },
    buttons: [prev, next],
  },
  {
    id: 'tour-character',
    text: `${title(
      'Creating Characters'
    )} Agnai does not yet provide a library of characters. You can create your own with the asssistance of AI and import character cards from other sites.`,
    attachTo: {
      element: '.tour-character',
      on: menuSide,
    },
    buttons: [
      {
        text: 'Back',
        classes: 'btn btn-primary',
        action: async () => {
          await getStore('settings').menu(true)
          homeTour.back()
        },
      },
      {
        text: 'Next',
        classes: 'btn btn-primary',
        action: async () => {
          await getStore('settings').closeMenu()
          homeTour.next()
        },
      },
    ],
  },
  {
    id: 'tour-first-chat',
    text: `${title(
      'Have Your First Chat'
    )}You can quickly jump in and chat with a friendly pre-built character to see to see what it's like.`,
    attachTo: {
      element: isMobile() ? '.tour-first-chat-mobile' : '.tour-first-chat',
      on: 'bottom',
    },
    buttons: [
      {
        text: 'Back',
        classes: 'btn btn-primary',
        action: async () => {
          await getStore('settings').menu(true)
          homeTour.back()
        },
      },
      {
        text: 'Done',
        classes: 'btn btn-primary',
        action: () => {
          homeTour.complete()
          setStoredValue('tour-home', true)
        },
      },
    ],
  },
])

if (isLoggedIn()) {
  homeTour.removeStep('tour-register')
}
