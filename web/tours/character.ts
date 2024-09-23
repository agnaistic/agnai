import Shepherd from 'shepherd.js'
import { tourTitle } from './util'
import { setStoredValue } from '../shared/hooks'

export { charTour as default }

const charTour = new Shepherd.Tour({
  useModalOverlay: true,
  defaultStepOptions: {
    scrollTo: true,
    classes: 'bg-800',
  },
})

const prev = {
  text: 'Back',
  classes: 'btn btn-primary',
  action: charTour.back,
}

const next = {
  text: 'Next',
  classes: 'btn btn-primary',
  action: charTour.next,
}

const win: any = window
win.charTourCancel = () => {
  charTour.cancel()
  setStoredValue('tour-char', true)
}

const title = (text: string) => tourTitle(text, 'charTourCancel')

charTour.addSteps([
  {
    id: 'tour-chargen',
    text: `${title('Character Generation')} You can use AI to help you build your characters.`,
    buttons: [next],
  },
  {
    id: 'tour-preset',
    text: `${title(
      'Generation Preset'
    )} (Optional) You can choose which model or preset is used to generate your character's fields and personality.`,
    attachTo: { element: '.tour-preset', on: 'bottom' },
    buttons: [prev, next],
  },
  {
    id: 'tour-prefields',
    text: `${title(
      'Required Fields'
    )} Fill out the name and description of your character. These will be used as the 'prompt' to generate the fields.`,
    attachTo: {
      element: '.tour-prefields',
      on: 'bottom',
    },
    buttons: [prev, next],
  },
  {
    id: 'tour-gen-field',
    text: `${title(
      'Generate a Field'
    )} You can click on the <code>Wand</code> icons to use AI to generate that field. Click again to re-generate it.`,
    attachTo: { element: '.tour-gen-field', on: 'bottom' },
    buttons: [prev, next],
  },
  {
    id: 'tour-persona-fields',
    text: `${title(
      'Persona Fields'
    )} You can either generate the entire persona as one field or generate text for each 'attribute.<br />You can change the Personality type to <code>Attributes</code> then name the attribute you want to generate and use the <code>Wand</code> icon next to that attribute.`,
    attachTo: {
      element: '.tour-persona',
      on: 'bottom',
    },
    buttons: [
      prev,
      {
        text: 'Done',
        classes: 'btn btn-primary',
        action: () => {
          charTour.complete()
          setStoredValue('tour-char', true)
          document.querySelector('#main-content')?.scroll({ top: 0, behavior: 'smooth' })
        },
      },
    ],
  },
])
