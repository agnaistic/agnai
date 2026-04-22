import { ImageRequestOpts } from '/srv/image/types'

export const oaiImageApi = {
  generateImage,
  getUrl,
}

async function generateImage(req: ImageRequestOpts, events?: { signal?: AbortController }) {
  const payload = await getPayload(req)

  const result = await fetch(getUrl(req.provider.url || ''), {
    signal: events?.signal?.signal,
    method: 'post',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  }).then((res) => res.json())

  if (result.error) {
    throw new Error(`OpenAI-Compat Image failed: ${result.error}`)
  }

  const imageResult = result.body[0]?.b64_json
  const image = await processBase64(imageResult)
  return image
}

async function processBase64(base64: string) {
  const full = base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`
  const blob = new Blob([full])
  const file = new File([blob], `swarm_${Date.now()}.png`, { type: 'image/png' })
  return { base64: full, file }
}

async function getPayload(req: ImageRequestOpts) {
  const size = `${req.settings?.width || 1024}x${req.settings?.height || 10234}`
  const payload: any = {
    prompt: req.prompt,
    size,
    steps: `${req.settings?.steps || 20}`,
    model: req.provider.model || '',
  }

  return payload
}

function getUrl(host: string) {
  const affix = host.endsWith('/') ? '' : '/'
  let lower = host.toLowerCase()
  if (lower.endsWith('/')) {
    lower = lower.slice(0, -1)
  }

  if (lower.endsWith('/images/generations')) {
    return host
  }

  if (lower.endsWith('/images')) {
    return host + affix + 'generations'
  }

  return host + affix + 'images/generations'
}
