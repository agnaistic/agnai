import { ImageRequestOpts } from '/srv/image/types'

export const oaiImageApi = {
  generateImage,
}

export type ImageResponse = Awaited<ReturnType<typeof processImage>>

async function getSessionId(hostname: string) {
  const session = await fetch(getUrl(hostname), {
    method: 'post',
    body: JSON.stringify({}),
    headers: { 'content-type': 'application/json' },
  }).then((res) => res.json())

  return session.session_id as string
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
    throw new Error(`SwarmUI failed: ${result.error}`)
  }

  const imagePath = result.images[0]
  const image = await processImage(req.provider.url || '', imagePath)
  return image
}

async function processImage(baseUrl: string, imagePath: string) {
  const image = await fetch(getUrl(baseUrl), {
    headers: { accept: 'image/png' },
  })
    .then((res) => res.blob())
    .then(async (blob) => {
      const buf = await blob.arrayBuffer()
      const buffer = Buffer.from(buf)
      const base64 = `data:image/png;base64,` + buffer.toString('base64')
      return { content: base64, blob, buffer }
    })

  const file = new File([image.blob], `swarm_${Date.now()}.png`, { type: image.blob.type })
  return { content: image.content, file, buffer: image.buffer }
}

async function processBase64(base64: string) {
  const full = base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`
  const blob = new Blob([full])
  const file = new File([blob], `swarm_${Date.now()}.png`, { type: 'image/png' })
  return { base64: full, file }
}

async function getPayload(req: ImageRequestOpts) {
  const session_id = await getSessionId(req.provider.url || '')
  const payload: any = {
    session_id,
    prompt: req.prompt,
    negativeprompt: req.negative || '',
    cfgscale: `${req.settings?.cfg || 5}`,
    steps: `${req.settings?.steps || 20}`,
    width: `${req.settings?.width || 1024}`,
    height: `${req.settings?.height || 1024}`,
    model: req.provider.model || '',
    sampler: req.provider.sampler || 'euler_ancestral',
    images: `1`,
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
