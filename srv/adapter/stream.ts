import { WebSocket } from 'ws'
import { eventGenerator } from '/common/util'

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
    } else if (!headers['content-type']?.startsWith('text/event-stream')) {
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

    const newMsgs = (msgBuffer + chunks.join('')).split(/\r?\n\r?\n/)

    chunks = []
    msgBuffer = newMsgs.pop() || ''

    for (const msg of newMsgs) {
      yield parseEvent(msg)
    }
  }
}

export type ServerSentEvent = { id?: string; type?: string; data: string }

function parseEvent(msg: string) {
  const buffer: ServerSentEvent = { data: '' }
  return msg.split(/\r?\n/).reduce(parseLine, buffer)
}

function parseLine(event: ServerSentEvent, line: string) {
  const sep = line.indexOf(':')
  const field = sep === -1 ? line : line.slice(0, sep)
  const value = sep === -1 ? '' : line.slice(sep + 1)

  switch (field) {
    case 'id':
      event.id = value.trim()
      break

    case 'event':
      event.type = value.trim()
      break

    case 'data':
      event.data += value.trimStart()
      break

    default:
      break
  }

  return event
}

export async function websocketStream(opts: { url: string; body: any }) {
  const socket = new WebSocket(opts.url.replace('https:', 'wss:').replace('http:', 'ws:'))

  const emitter = eventGenerator()
  let accum = ''

  socket.on('error', (err) => {
    emitter.push({ error: err.message })
    emitter.done()
  })

  socket.on('open', () => {
    socket.send(JSON.stringify(opts.body))
  })

  socket.on('close', () => {
    emitter.done()
  })

  socket.on('message', (data: any) => {
    const obj = JSON.parse(data)

    if (obj.event === 'text_stream') {
      emitter.push({ token: obj.text })
      accum += obj.text
    }
    if (obj.event === 'stream_end') {
      emitter.push(accum)
      emitter.done()
      socket.close()
    }
  })

  return emitter.stream
}
