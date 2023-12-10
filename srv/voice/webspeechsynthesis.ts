import { Validator } from '/common/valid'
import { StatusError } from '../api/wrap'

const validator: Validator = {
  service: 'string',
  voiceId: 'string',
  pitch: 'number?',
  rate: 'number?',
}

export const webSpeechSynthesisHandler = {
  validator,
  getVoices: () => {
    throw new StatusError('Web Speech Synthesis can only be generated in the browser', 400)
  },
  getModels: () => {
    throw new StatusError('Web Speech Synthesis can only be generated in the browser', 400)
  },
  generateVoice: () => {
    throw new StatusError('Web Speech Synthesis can only be generated in the browser', 400)
  },
}
