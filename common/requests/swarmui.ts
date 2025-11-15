import { lazySimplePromise } from '../util'
import { ImageRequestOpts } from '/srv/image/types'

/**
 * POST /API/GetNewSession
 *
 *
 * POST /API/ListModels
 * session_id: string
 * path: ''
 * depth: 5
 *
 * POST /API/GenerateText2Image
 * rawInput: { ... }
 * -- session_id: string
 * -- prompt: string
 * -- model: string
 * -- steps: number
 * -- width: number
 * -- height: number
 * -- images: number
 * -- seed: number
 * -- cfg scale?
 * -- sampler?
 * -- scheduler?
 *
 *
 * Returns: { images: string[] }
 *
 * GET /:imagePath
 *
 */

export const swarmApi = {
  getModelList,
  generateImage,
  generateImageWS,
}

export type ImageResponse = Awaited<ReturnType<typeof processImage>>

async function getSessionId(hostname: string | undefined) {
  const session = await fetch(getUrl({ host: hostname, path: 'GetNewSession' }), {
    method: 'post',
    body: JSON.stringify({}),
    headers: { 'content-type': 'application/json' },
  }).then((res) => res.json())

  return session.session_id as string
}

async function getModelList(hostname?: string, subtype?: string) {
  const session_id = await getSessionId(hostname)

  const res = (await fetch(getUrl({ host: hostname, path: '/ListModels' }), {
    method: 'post',
    body: JSON.stringify({ session_id, path: '', depth: 10, subtype }),
    headers: { 'content-type': 'application/json' },
  }).then((res) => res.json())) as {
    files: Array<{
      name: string
      title: string
      class?: string
      compat_class?: string
      architecture?: string
      trigger_phrase?: string
    }>
    folders: string[]
  }

  const models = res.files
    .map((file) => ({
      ...file,
      title: file.name.split('.').slice(0, -1).join('.'),
      tags: file.trigger_phrase?.split(','),
    }))
    .filter((file) => !!file.architecture) as Array<{
    name: string
    title: string
    tags?: string[]
  }>

  return { models, json: res }
}

async function generateImageWS(
  req: ImageRequestOpts,
  events?: {
    signal?: AbortController
    onError?: (error: any) => void
    onDone?: (image: ImageResponse) => void
    onPreview?: (step: { file: File; base64: string; percent: number }) => void
  }
) {
  const payload = await getPayload(req)

  let url = getUrl({ host: req.settings?.swarm?.url, path: 'GenerateText2ImageWS' })
  url = url.replace('http://', 'ws://').replace('https://', 'wss://')

  const ws = new WebSocket(url)
  const lazy = lazySimplePromise<ImageResponse>()
  let done = false

  if (events?.signal) {
    events.signal.signal.onabort = () => {
      if (done) return
      ws.close()
      done = true
      events.onError?.(`Image generation cancelled`)
    }
  }

  ws.onopen = () => {
    ws.send(JSON.stringify(payload))
  }

  ws.onmessage = async (msg) => {
    const json = typeof msg.data === 'string' ? JSON.parse(msg.data) : msg.data

    if (json.image) {
      done = true
      const image = await processImage(req.settings?.swarm?.url, json.image)
      ws.close()
      lazy.resolve(image)
      events?.onDone?.(image)
    }

    if (json.error) {
      if (done) return
      done = true
      lazy.reject(json.error)
      events?.onError?.(json.error)
    }

    const progress = json.gen_progress
    if (progress?.preview) {
      const percent = progress.current_percent as number
      const image = await processBase64(progress.preview)

      events?.onPreview?.({ ...image, percent })
    }
  }

  ws.onerror = () => {
    const error = `Failed to connect to SwarmUI service`
    lazy.reject(error)
    events?.onError?.(error)
  }

  ws.onclose = () => {
    if (done) return
    const error = `SwarmUI failed to generate an image`
    lazy.reject(error)
    events?.onError?.(error)
    done = true
  }

  return lazy.promise
}

async function generateImage(req: ImageRequestOpts, events?: { signal?: AbortController }) {
  const payload = await getPayload(req)

  const result = await fetch(
    getUrl({ host: req.settings?.swarm?.url, path: 'GenerateText2Image' }),
    {
      signal: events?.signal?.signal,
      method: 'post',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    }
  ).then((res) => res.json())

  if (result.error) {
    throw new Error(`SwarmUI failed: ${result.error}`)
  }

  const imagePath = result.images[0]
  const image = await processImage(req.settings?.swarm?.url, imagePath)
  return image
}

async function processImage(baseUrl: string | undefined, imagePath: string) {
  const image = await fetch(getUrl({ host: baseUrl, path: imagePath, getter: true }), {
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
  const session_id = await getSessionId(req.settings?.swarm?.url)
  const payload: any = {
    session_id,
    prompt: req.prompt,
    negativeprompt: req.negative || '',
    cfgscale: `${req.settings?.cfg || 5}`,
    steps: `${req.settings?.steps || 20}`,
    width: `${req.settings?.width || 1024}`,
    height: `${req.settings?.height || 1024}`,
    model: req.settings?.swarm?.model || '',
    sampler: req.settings?.swarm?.sampler || 'euler_ancestral',
    images: `1`,
  }

  if (req.settings?.swarm?.loras) {
    const loras: string[] = []
    const weights: number[] = []
    for (const lora of req.settings?.swarm?.loras) {
      if (!lora.id || !lora.enabled) continue
      loras.push(lora.id)
      weights.push(lora.modelStrength)
    }

    if (loras.length) {
      payload.loras = loras.join(',')
      payload.loraweighs = weights.join(',')
    }
  }

  return payload
}

function getUrl(opts: { host?: string; path: string; getter?: boolean }) {
  const affix = opts.getter ? '' : '/API'
  const prefix = opts.path.startsWith('/') ? affix : `${affix}/`
  const host = opts.host || 'http://localhost:7801'

  return `${host}${prefix}${opts.path}`
}

/**
 * aspectratio
: 
"1:1"
automaticvae
: 
true
batchsize
: 
"1"
cfgscale
: 
"6"
colorcorrectionbehavior
: 
"None"
colordepth
: 
"8bit"
controlnetpreviewonly
: 
false
debugregionalprompting
: 
false
donotsave
: 
false
donotsaveintermediates
: 
false
easycachemode
: 
"disabled"
extra_metadata
: 
{}
gligenmodel
: 
"None"
height
: 
"1024"
images
: 
"1"
internalbackendtype
: 
"Any"
loras
: 
""
lorasectionconfinement
: 
""
loratencweights
: 
""
loraweights
: 
""
maskcompositeunthresholded
: 
false
model
: 
"JANKUV5NSFWTrainedNoobai_v50"
modelspecificenhancements
: 
true
negativeprompt
: 
""
nopreviews
: 
false
noseedincrement
: 
false
outputintermediateimages
: 
false
personalnote
: 
""
placeholderparamgroupstarred
: 
false
placeholderparamgroupuserone
: 
false
placeholderparamgroupuserthree
: 
false
placeholderparamgroupusertwo
: 
false
presets
: 
[]
prompt
: 
"blonde, petite, 1girl, 34dd breasts, modest clothing, beach, night, full_moon, starry sky, hand_in_pants, male POV, public nudity risk, embarrassed, flushed, looking down, handjob, outdoor, sand"
regionalobjectcleanupfactor
: 
"0"
removebackground
: 
false
renormcfg
: 
"0"
savesegmentmask
: 
false
seamlesstileable
: 
"false"
seed
: 
"-1"
segmentsortorder
: 
"left-right"
session_id
: 
"c3bc92f49250d2e1a79a1c38a9cd7470c8553f4d"
shiftedlatentaverageinit
: 
false
sidelength
: 
"1024"
steps
: 
"30"
torchcompile
: 
"Disabled"
trimvideoendframes
: 
"0"
trimvideostartframes
: 
"0"
usecfgzerostar
: 
false
usetcfg
: 
false
videopreviewtype
: 
"animate"
webhooks
: 
"Normal"
width
: 
"1024"
wildcardseedbehavior
: 
"Random"
zeronegative
: 
false
 */
