import { Validator } from 'frisker'
import { StatusError } from '../api/wrap'

const valid: Validator = {
  backend: 'string',
  voiceId: 'string',
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
