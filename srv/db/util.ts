import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { config } from '../config'
import { AppSchema } from '../../common/types/schema'
import { defaultChars } from '../../common/characters'

const ALGO = 'aes-192-cbc'
const KEY = crypto.scryptSync(config.jwtSecret, 'salt', 24)
const KEY_LB = crypto.scryptSync(`${config.jwtSecret}\n`, 'salt', 24)
const KEY_TRIM = crypto.scryptSync(`${config.jwtSecret}\\n`, 'salt', 24)

export const STARTER_CHARACTER: AppSchema.Character = {
  _id: '',
  userId: '',
  kind: 'character',
  createdAt: '',
  updatedAt: '',
  favorite: false,
  visualType: 'avatar',
  ...defaultChars.Robot,
}

export function now() {
  return new Date().toISOString()
}

export async function encryptPassword(value: string) {
  const salt = await bcrypt.genSalt()
  const hash = await bcrypt.hash(value, salt)

  return hash
}

export function encryptUserText(text: string, key: string) {
  return getCrypto().user(text, key)
}

export function encryptText(text: string) {
  return getCrypto().text(text)
}

export function decryptText(text: string, noError?: boolean) {
  return getCrypto().decrypt(text, noError)
}

function encryptUserText20(text: string, key: string) {
  const cipher = crypto.createCipher('aes256', key)
  const encrypted = cipher.update(text, 'utf8', 'hex') + cipher.final('hex')
  return encrypted
}

function encryptText20(text: string) {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGO, KEY as any, iv as any)
  const encrypted = cipher.update(text, 'utf8', 'hex')

  return [encrypted + cipher.final('hex'), Buffer.from(iv as any).toString('hex')].join('|')
}

function decryptText20(text: string, noError?: boolean) {
  const [encrypted, iv] = text.split('|')
  if (!iv) {
    // If there is no IV it's likely to already be decrypted
    if (noError) return text
    throw new Error('IV not found')
  }

  try {
    const decipher = crypto.createDecipheriv(ALGO, KEY_TRIM as any, Buffer.from(iv, 'hex') as any)
    return decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8')
  } catch (ex) {}

  try {
    const decipher = crypto.createDecipheriv(ALGO, KEY as any, Buffer.from(iv, 'hex') as any)
    return decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8')
  } catch (ex) {}

  try {
    const decipher = crypto.createDecipheriv(ALGO, KEY_LB as any, Buffer.from(iv, 'hex') as any)
    return decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8')
  } catch (ex) {}

  if (noError) return ''
  throw new Error(`Could not read API key: Try re-entering your service API key.`)
}

export async function wait(ms: number) {
  return new Promise((res) => setTimeout(res, ms))
}

function getCrypto() {
  const v = +process.version.slice(1, 3)
  if (v <= 20) {
    return { text: encryptText20, user: encryptUserText20, decrypt: decryptText20 }
  }

  return { text: encryptText24, user: encryptUserText24, decrypt: decryptText24 }
}

function evpBytesToKey(
  password: string,
  keyLen: number,
  ivLen: number
): { key: Buffer; iv: Buffer } {
  let derived = Buffer.alloc(0)
  let prev: Buffer = Buffer.alloc(0)

  while (derived.length < keyLen + ivLen) {
    const hash = crypto.createHash('md5')
    hash.update(prev)
    hash.update(password, 'utf8')
    prev = hash.digest()
    derived = Buffer.concat([derived, prev])
  }

  return { key: derived.subarray(0, keyLen), iv: derived.subarray(keyLen, keyLen + ivLen) }
}

export function encryptUserText24(text: string, key: string) {
  const { key: k, iv } = evpBytesToKey(key, 32, 16)
  const cipher = crypto.createCipheriv('aes-256-cbc', k, iv)
  const encrypted = cipher.update(text, 'utf8', 'hex') + cipher.final('hex')
  return encrypted
}

export function encryptText24(text: string) {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGO, KEY, iv)
  const encrypted = cipher.update(text, 'utf8', 'hex')

  return [encrypted + cipher.final('hex'), iv.toString('hex')].join('|')
}

export function decryptText24(text: string, noError?: boolean) {
  const [encrypted, iv] = text.split('|')
  if (!iv) {
    // If there is no IV it's likely to already been decrypted
    if (noError) return text
    throw new Error('IV not found')
  }

  for (const key of [KEY_TRIM, KEY, KEY_LB]) {
    try {
      const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(iv, 'hex'))
      return decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8')
    } catch (ex) {}
  }

  if (noError) return ''
  throw new Error(`Could not read API key: Try re-entering your service API key.`)
}
