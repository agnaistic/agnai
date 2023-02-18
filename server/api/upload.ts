import mp from 'multiparty'
import { Request } from 'express'
import { writeFile } from 'fs/promises'
import { extname, resolve } from 'path'
import { createReadStream, mkdirSync, readdirSync } from 'fs'
import { v4 } from 'uuid'

export type Attachment = {
  field: string
  original: string
  filename: string
  type: string
}

export function handleUpload<T = {}>(req: Request) {
  const form = new mp.Form()

  const obj: any = {}
  const attachments: Attachment[] = []
  const jobs: Promise<any>[] = []

  return new Promise<T & { attachments: Attachment[] }>((resolve, reject) => {
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

        attachments.push({ field: part.name, filename: id, type, original: filename })
        jobs.push(saveFile(id, data))
        part.resume()
      })
    })

    form.on('close', async () => {
      try {
        await Promise.all(jobs)
        resolve({ ...obj, attachments })
      } catch (ex) {
        reject(ex)
      }
    })

    form.on('error', (err) => reject(err))

    form.parse(req)
  })
}

const assetFolders = resolve(process.cwd(), 'dist', 'assets')

export async function saveFile(filename: string, content: any) {
  await writeFile(resolve(assetFolders, filename), content, { encoding: 'utf8' })
}

export function getFile(filename: string) {
  const stream = createReadStream(resolve(assetFolders, filename))
  const type = getType(filename)
  return { stream, type }
}

function createAssetFolder() {
  try {
    readdirSync(assetFolders)
  } catch (ex) {
    mkdirSync(assetFolders)
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
