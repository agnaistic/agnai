import { wrap } from '../wrap'
import { assertValid } from '/common/valid'

export const plainGenerate = wrap(async (req, res) => {
  assertValid({ prompt: 'string', settings: 'any?' }, req.body)
})
