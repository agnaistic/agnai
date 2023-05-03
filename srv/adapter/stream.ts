import type { NeedleResponse } from 'needle'

/** Converts a Needle response stream to an async generator which yields server-sent events. */
export async function* needleToSSE(needleStream: NeedleResponse) {
  let buffer = ''
  let streamEnded = false

  needleStream.on('header', (statusCode, headers) => {
    if (statusCode !== 200) {
      needleStream.emit('err', new Error(`SSE request failed with status code ${statusCode}`))
    } else if (headers['content-type'] !== 'text/event-stream') {
      needleStream.emit(
        'err',
        new Error(`SSE request received unexpected content-type ${headers['content-type']}`)
      )
    }
  })

  needleStream.on('err', (err) => {
    throw err
  })

  needleStream.on('done', () => {
    streamEnded = true
  })

  while (!streamEnded) {
    const chunk = await new Promise<string>((resolve) => {
      needleStream.once('data', (data) => resolve(data.toString()))
      needleStream.once('done', () => resolve(''))
    })

    const newMessages = (buffer + chunk).split('\n\n')
    buffer = newMessages.pop() || ''

    for (const msg of newMessages) {
      yield msg
    }
  }
}
