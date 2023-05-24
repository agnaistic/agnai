/**
 * Converts a Needle readable stream to an async generator which yields server-sent events.
 * Operates on Needle events, not NodeJS ReadableStream events.
 * https://github.com/tomas/needle#events
 **/
export async function* needleToSSE(needleStream: NodeJS.ReadableStream) {
  let msgBuffer = ''
  let chunks: string[] = []
  let done = false

  let tick: () => void
  let waitForData = new Promise<void>((resolve) => (tick = resolve))

  let error: Error | undefined

  needleStream.on('header', (statusCode, headers) => {
    if (statusCode > 201) {
      needleStream.emit('err', new Error(`SSE request failed with status code ${statusCode}`))
    } else if (headers['content-type'] !== 'text/event-stream') {
      needleStream.emit(
        'err',
        new Error(`SSE request received unexpected content-type ${headers['content-type']}`)
      )
    }
  })

  needleStream.on('err', (err) => {
    error = err
  })

  needleStream.on('done', () => {
    done = true
    tick()
  })

  needleStream.on('data', (chunk: Buffer) => {
    chunks.push(chunk.toString())
    tick()
    waitForData = new Promise((resolve) => (tick = resolve))
  })

  while (!done) {
    await waitForData
    if (error) {
      // Needle will emit data chunks containing the error body before emitting the error event.
      const errorPayload = chunks.join('')
      throw new Error(`${error.message}: ${errorPayload}`)
    }

    const newMsgs = (msgBuffer + chunks.join('')).split('\n\n')
    chunks = []
    msgBuffer = newMsgs.pop() || ''

    for (const msg of newMsgs) {
      yield msg
    }
  }
}
