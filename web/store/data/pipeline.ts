import { api } from '../api'

export const pipelineApi = {
  isAvailable,
  summarize,
  textToSpeech,
}

const baseUrl = `http://localhost:5001`

let online = false

function isAvailable() {
  return online
}

/**
 * Not yet implemented
 */
async function textToSpeech(text: string) {
  const res = await method('post', '/tts', { text })
  return res
}

async function summarize(text: string) {
  const res = await method('post', '/summarize', { prompt: text })
  return res
}

async function check() {
  const res = await method('get', '/status')
  if (res.result) online = true
  if (res.error) online = false
}

const method: typeof api.method = (method, path, body, opts) => {
  return api.method(method, `${baseUrl}${path}`, body, { ...opts, noAuth: true })
}

check()
