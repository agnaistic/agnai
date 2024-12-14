import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { config } from '../config'
import { AppSchema } from '../../common/types/schema'
import { defaultChars } from '../../common/characters'

const ALGO = 'aes-192-cbc'
const KEY = crypto.scryptSync(config.jwtSecret, 'salt', 24)
const KEY_LB = crypto.scryptSync(`${config.jwtSecret}\n`, 'salt', 24)

export function now() {
  return new Date().toISOString()
}

export async function encryptPassword(value: string) {
  const salt = await bcrypt.genSalt()
  const hash = await bcrypt.hash(value, salt)

  return hash
}

export function encryptUserText(text: string, key: string) {
  const cipher = crypto.createCipher('aes256', key)
  const encrypted = cipher.update(text, 'utf8', 'hex') + cipher.final('hex')
  return encrypted
}

export function encryptText(text: string) {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGO, KEY, iv)
  const encrypted = cipher.update(text, 'utf8', 'hex')

  return [encrypted + cipher.final('hex'), Buffer.from(iv).toString('hex')].join('|')
}

export function decryptText(text: string, noError?: boolean) {
  const [encrypted, iv] = text.split('|')
  if (!iv) throw new Error('IV not found')

  try {
    const decipher = crypto.createDecipheriv(ALGO, KEY, Buffer.from(iv, 'hex'))
    return decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8')
  } catch (ex) {}

  try {
    const decipher = crypto.createDecipheriv(ALGO, KEY_LB, Buffer.from(iv, 'hex'))
    return decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8')
  } catch (ex) {}

  if (noError) return ''
  throw new Error(`Could not read API key: Try re-entering your service API key.`)
}

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

export async function wait(ms: number) {
  return new Promise((res) => setTimeout(res, ms))
}
