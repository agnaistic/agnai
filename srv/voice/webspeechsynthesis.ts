import { Validator } from 'frisker'
import { StatusError } from '../api/wrap'

const valid: Validator = {
  backend: 'string',
  voiceId: 'string',
  pitch: 'number?',
  rate: 'number?',
}

export const webSpeechSynthesisHandler = {
  valid,
  getVoices: () => {
    throw new StatusError('Web Speech Synthesis can only be generated in the browser', 400)
  },
  generateVoice: () => {
    throw new StatusError('Web Speech Synthesis can only be generated in the browser', 400)
  },
}
