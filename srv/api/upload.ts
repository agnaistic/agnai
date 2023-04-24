import { S3 } from '@aws-sdk/client-s3'
import { mkdirpSync } from 'mkdirp'
import { Request } from 'express'
import { unlink, writeFile } from 'fs/promises'
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

export function handleForm<T extends Validator>(
  req: Request,
  type: T
): UnwrapBody<T> & { attachments: Attachment[] } {
  const attachments: Attachment[] = []

  if (Array.isArray(req.files)) {
    for (const file of req.files) {
      if (!isAllowedType(file.mimetype)) continue
      const ext = file.mimetype.split('/').slice(-1)[0]
      attachments.push({
        field: file.fieldname,
        content: file.buffer,
        ext,
        original: file.originalname,
        type: file.mimetype,
      })
    }
  }

  const result: any = { ...req.body, attachments }
  assertValid(type, result)
  return result as any
}

export async function entityUpload(kind: string, id: string, attachment?: Attachment) {
  if (!attachment) return
  const filename = `${kind}-${id}`
  return upload(attachment, filename)
}

export async function upload(attachment: Attachment, name: string, ttl?: number) {
  const filename = `${name}.${attachment.ext}`
  if (config.storage.enabled) {
    await s3.putObject({
      Expires: ttl ? new Date(Date.now() + ttl * 1000) : undefined,
      Bucket: config.storage.bucket,
      Key: `assets/${name}.${attachment.ext}`,
      Body: attachment.content,
      ContentType: attachment.type,
      ACL: 'public-read',
    })
    return `/assets/` + filename
  }

  await saveFile(filename, attachment.content, ttl)
  return `/assets/` + filename
}

export async function saveFile(filename: string, content: any, ttl?: number) {
  if (config.storage.enabled) {
    await s3.putObject({
      Expires: ttl ? new Date(Date.now() + ttl * 1000) : undefined,
      Bucket: config.storage.bucket,
      Key: `assets/${filename}`,
      Body: content,
      ContentType: getType(filename),
      ACL: 'public-read',
    })
    return `/assets/` + filename
  }

  if (ttl) {
    setTimeout(() => unlink(resolve(config.assetFolder, filename)).catch((err) => err), ttl * 1000)
  }
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
