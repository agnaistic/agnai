import { WebSocket } from 'ws'
import { eventGenerator } from '/common/util'
import { logger } from '../middleware'

export type ServerSentEvent = {
  id?: string
  type?: string
  data?: any
  error?: string
  index?: number
}

export async function websocketStream(
  opts: { url: string; body: any; signal: AbortController },
  timeoutMs?: number
) {
  const socket = new WebSocket(opts.url.replace('https:', 'wss:').replace('http:', 'ws:'))

  if (opts.signal) {
    opts.signal.signal.onabort = () => {
      if (socket.readyState !== socket.OPEN) return
      socket.send(JSON.stringify({ type: 'user-cancel' }))
    }
  }

  const emitter = eventGenerator()
  let accum = ''

  // Terminate the request if the first token is not received without the timeout window
  const ttfbTimer = timeoutMs
    ? setTimeout(() => {
        emitter.push({ error: `request cancelled - timed out` })
        emitter.done()
      }, timeoutMs)
    : 0

  socket.on('error', (err) => {
    if ('syscall' in err && 'code' in err) {
      emitter.push({ error: `Service unreachable - ${err.code}` })
      emitter.done()
      return
    }

    emitter.push({ error: 'Inference connection failed' })
    logger.error({ err }, 'Inference connection failed')
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

    if (obj.response_type === 'chunk') {
      clearTimeout(ttfbTimer)
      emitter.push({ token: obj.chunk })
      accum += obj.chunk
    }

    if (obj.event === 'text_stream') {
      clearTimeout(ttfbTimer)
      emitter.push({ token: obj.text })
      accum += obj.text
    }

    if (obj.meta) {
      emitter.push({ meta: obj.meta })
    }

    if (obj.event === 'error') {
      emitter.push({ error: obj.error })
    }

    if (obj.event === 'stream_end' || obj.response_type === 'full') {
      const text = obj.text ? obj.text : accum
      emitter.push(text)
      emitter.done()
      socket.close()
    }
  })

  return emitter.stream
}
