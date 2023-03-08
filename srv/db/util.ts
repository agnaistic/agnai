import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { config } from '../config'
import { AppSchema } from './schema'

const ALGO = 'aes-192-cbc'
const KEY = crypto.scryptSync(config.jwtSecret, 'salt', 24)

export function now() {
  return new Date().toISOString()
}

export async function encryptPassword(value: string) {
  const salt = await bcrypt.genSalt()
  const hash = await bcrypt.hash(value, salt)

  return hash
}

export function encryptText(text: string) {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGO, KEY, iv)
  const encrypted = cipher.update(text, 'utf8', 'hex')

  return [encrypted + cipher.final('hex'), Buffer.from(iv).toString('hex')].join('|')
}

export function decryptText(text: string) {
  const [encrypted, iv] = text.split('|')
  if (!iv) throw new Error('IV not found')
  const decipher = crypto.createDecipheriv(ALGO, KEY, Buffer.from(iv, 'hex'))
  return decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8')
}

export const STARTER_CHARACTER: AppSchema.Character = {
  _id: '',
  userId: '',
  kind: 'character',
  createdAt: '',
  updatedAt: '',
  name: 'Robot',
  persona: {
    kind: 'boostyle',
    attributes: {
      species: ['human'],
      mind: ['kind', 'compassionate', 'caring', 'tender', 'forgiving'],
      personality: ['kind', 'compassionate', 'caring', 'tender', 'forgiving'],
      job: ['therapist'],
    },
  },
  sampleChat:
    '{{user}}: Something has been troubling me this week.\r\n{{char}}: *I appear genuinely concerned* What is troubling you?',
  scenario:
    "Robot is in their office. You knock on the door and Robot beckons you inside. You open the door and enter Robot's office.",
  greeting:
    "*A soft smile appears on my face as I see you enter the room* Hello! It's good to see you again. Please have a seat! What is on your mind today?",
}
