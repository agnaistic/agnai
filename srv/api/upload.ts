import { S3 } from '@aws-sdk/client-s3'
import mp from 'multiparty'
import { mkdirpSync } from 'mkdirp'
import { Request } from 'express'
import { writeFile } from 'fs/promises'
import { extname, resolve } from 'path'
import { createReadStream, readdirSync } from 'fs'
import { assertValid, Validator, UnwrapBody } from 'frisker'
import { config } from '../config'

const s3 = new S3({
  region: 'us-east-1',
  forcePathStyle: false,
  endpoint: `https://${config.storage.endpoint}`,
  credentials: {
    accessKeyId: config.storage.id,
    secretAccessKey: config.storage.key,
  },
})

export type Attachment = {
  field: string
  original: string
  type: string
  content: Buffer
  ext: string
}

export function handleForm<T extends Validator>(req: Request, type: T) {
  const form = new mp.Form()

  const obj: any = {}
  const attachments: Attachment[] = []

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

        attachments.push({
          field: part.name,
          content: data,
          type,
          original: filename,
          ext,
        })
        part.resume()
      })
    })

    form.on('close', async () => {
      try {
        assertValid(type, obj)
        resolve({ ...obj, attachments } as any)
      } catch (ex) {
        reject(ex)
      }
    })

    form.on('error', (err) => reject(err))
    form.parse(req)
  })
}

export async function entityUpload(kind: string, id: string, attachment?: Attachment) {
  if (!attachment) return
  const filename = `${kind}-${id}`
  return upload(attachment, filename)
}

export async function upload(attachment: Attachment, name: string) {
  const filename = `${name}.${attachment.ext}`
  if (config.storage.enabled) {
    await s3.putObject({
      Bucket: config.storage.bucket,
      Key: `assets/${name}.${attachment.ext}`,
      Body: attachment.content,
      ContentType: attachment.type,
      ACL: 'public-read',
    })
    return `/assets/` + filename
  }

  await saveFile(filename, attachment.content)
  return `/assets/` + filename
}

export async function saveFile(filename: string, content: any) {
  await writeFile(resolve(config.assetFolder, filename), content, { encoding: 'utf8' })
  return `/assets/${filename}`
}

export async function saveBase64File(filename: string, content: any) {
  await writeFile(resolve(config.assetFolder, filename), content, 'base64')
  return `/assets/${filename}`
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
