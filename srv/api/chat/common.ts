import { Response } from 'express'
import { GenerateOptions, generateResponse } from '../adapter/generate'

export async function streamMessage(opts: GenerateOptions, res: Response) {
  const stream = await generateResponse(opts).catch((err: Error) => err)

  if (stream instanceof Error) {
    res.status(500).send({ message: stream.message })
    return
  }

  let generated = ''

  for await (const msg of stream) {
    if (typeof msg !== 'string') {
      res.status(500)
      res.write(JSON.stringify(msg))
      res.send()
      return
    }

    generated += msg.trim()
    res.write(msg)
    res.write('\n\n')
  }

  return generated.replace(/\s+/g, ' ').trim()
}
