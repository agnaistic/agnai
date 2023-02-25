import dotenv from 'dotenv'
import { v4 } from 'uuid'

dotenv.config({ path: '.env' })

export const config = {
  jwtSecret: env('JWT_SECRET'),
  port: +env('PORT', '3001'),
  db: {
    name: env('DB_NAME', 'pyg'),
  },
  kobold: {
    maxLength: +env('KOBOLD_MAX_LENGTH', '64'),
  },
  noRequestLogs: env('DISABLE_REQUEST_LOGGING', 'false') === 'true',
  chai: {
    url: env('CHAI_URL', ''),
    uid: env('CHAI_UID', 'empty'),
    key: env('CHAI_KEY', 'empty'),
  },
  classifyUrl: env('CLASSIFY_URL', 'http://localhost:5001'),
  init: {
    username: env('INITIAL_USER', 'admin'),
    password: env('INITIAL_PASSWORD', v4()),
  },
}

function env(key: string, fallback?: string): string {
  const value = process.env[key] || fallback || ''

  if (value === undefined) {
    throw new Error(`Required environment variable not set: "${key}"`)
  }

  return value
}
