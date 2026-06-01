import needle from 'needle'
import { handle, StatusError } from '../wrap'
import { ServerEmbedding } from '/common/types/admin'
import { store } from '/srv/db'
import { decryptText } from '/srv/db/util'
import { assertValid } from '/common/valid'

const CACHED_KEYS: Record<string, string> = {}

export const embedText = handle(async (req, res) => {
  assertValid({ inputs: ['string'] }, req.body)

  const match = await getEmbeddingServer()
  if (!match) return { server: false }

  if (!req.body.inputs.length) {
    return { embeds: [] }
  }

  const texts = req.body.inputs

  try {
    const embeds = match.batch ? await embedMultiple(texts, match) : await embedSingle(texts, match)
    return { embeds }
  } catch (ex) {
    req.log.error({ err: ex, embed: { ...match, key: '' } }, `Failed to embed texts`)
    throw new StatusError(
      `Could not perform server-side embedding. Request ID: ${req.requestId}`,
      500
    )
  }
})

export async function embedMultiple(inputs: string[], embed: ServerEmbedding) {
  const payload: any = { model: embed.model }

  if (embed.inputProp) {
    payload[embed.inputProp] = inputs
  } else {
    payload.inputs = inputs
  }

  const result = await needle('post', embed.url, payload, {
    json: true,
    headers: { Authorization: `Bearer ${embed.key}` },
  })

  try {
    const embeddings = result.body.data.map((data: any) => data.embedding)
    return embeddings
  } catch (ex) {
    throw ex
  }
}

export async function embedSingle(texts: string[], embed: ServerEmbedding) {
  const payload: any = { model: embed.model }

  const results: any[] = []

  for (const text of texts) {
    if (embed.inputProp) {
      payload[embed.inputProp] = text
    } else {
      payload.input = text
    }

    const result = await needle('post', embed.url, payload, {
      json: true,
      headers: { Authorization: `Bearer ${embed.key}` },
    })

    results.push(result.body)
  }

  return results
}

async function getEmbeddingServer() {
  const cfg = await store.admin.getServerConfiguration()
  if (!cfg.embedding || !cfg.embeddings?.length) return

  for (const embed of cfg.embeddings) {
    if (embed._id !== cfg.embedding) continue
    if (CACHED_KEYS[embed.key]) {
      embed.key = CACHED_KEYS[embed.key]
      return embed
    }

    const key = decryptText(embed.key)
    CACHED_KEYS[embed.key] = key
    embed.key = key

    return embed
  }
}
