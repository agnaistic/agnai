import mp from 'multiparty'
import { mkdirpSync } from 'mkdirp'
import { Request } from 'express'
import { rename, writeFile } from 'fs/promises'
import { basename, dirname, extname, resolve } from 'path'
import { createReadStream, readdirSync } from 'fs'
import { v4 } from 'uuid'
import { assertValid, Validator, UnwrapBody } from 'frisker'
import { config } from '../config'

export type Attachment = {
  field: string
  original: string
  filename: string
  type: string
}

export function handleUpload<T extends Validator>(req: Request, type: T, filename?: string) {
  const form = new mp.Form()

  const obj: any = {}
  const attachments: Attachment[] = []
  const jobs: Promise<any>[] = []

  return new Promise<UnwrapBody<T> & { attachments: Attachment[] }>((resolve, reject) => {
    form.on('part', (part) => {
      const chunks: Buffer[] = []
      part.on('data', (chunk) => {
        chunks.push(chunk)
      })

      part.on('end', async () => {
        if (!part.filename) {
          const data = Buffer.concat(chunks).toString()
          obj[part.name] = data
          part.resume()
          return
        }

        const type = part.headers['content-type']
        if (!isAllowedType(type)) {
          part.resume()
          return
        }

        const ext = type.split('/').slice(-1)[0]
        const filename = part.filename
        const data = Buffer.concat(chunks)
        const id = `${new Date().toISOString()}_${v4().slice(0, 7)}.${ext}`.split(':').join('-')

        attachments.push({
          field: part.name,
          filename: `/assets/${id}`,
          type,
          original: filename,
        })
        jobs.push(saveFile(id, data))
        part.resume()
      })
    })

    form.on('close', async () => {
      try {
        await Promise.all(jobs)
        try {
          assertValid(type, obj)
        } catch (ex) {
          return reject(ex)
        }
        resolve({ ...obj, attachments } as any)
      } catch (ex) {
        reject(ex)
      }
    })

    form.on('error', (err) => reject(err))

    form.parse(req)
  })
}

export async function renameFile(attach: Attachment, filename: string) {
  const base = basename(attach.filename)
  const folder = dirname(attach.filename)
  const ext = extname(attach.filename)

  await rename(resolve(config.assetFolder, base), resolve(config.assetFolder, filename + ext))
}

export async function saveFile(filename: string, content: any) {
  await writeFile(resolve(config.assetFolder, filename), content, { encoding: 'utf8' })
}

export function getFile(filename: string) {
  const stream = createReadStream(resolve(config.assetFolder, filename))
  const type = getType(filename)
  return { stream, type }
}

function createAssetFolder() {
  try {
    readdirSync(config.assetFolder)
  } catch (ex) {
    mkdirpSync(config.assetFolder)
  }
}

function getType(filename: string) {
  const ext = extname(filename)

  switch (ext) {
    case '.json':
      return 'application/json'

    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'

    case '.png':
      return 'image/png'

    case '.webm':
      return 'video/webm'

    case '.gif':
      return 'image/gif'
  }

  return 'octet-stream'
}

createAssetFolder()

function isAllowedType(contentType: string) {
  switch (contentType) {
    case 'image/jpeg':
    case 'image/jpg':
    case 'image/png':
      return true
  }

  return false
}
