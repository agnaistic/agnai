import dotenv from 'dotenv'
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import { v4 } from 'uuid'
import { AIAdapter } from '../common/adapters'

dotenv.config({ path: '.env' })

/**
 * We always want to use a relatively safe JWT signing secret
 * If the user has not provided one:
 * - Create one
 * - Save it to a file
 * - Apply it to the environment variables
 *
 * When the application restarts we will try to retrieve the previously saved secret
 */
if (!process.env.JWT_SECRET) {
  const secret = readSecret()
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error(
      `JWT_SECRET not set and .token_secret file does not exist. One must be provided in production.`
    )
  }

  const newSecret = v4()
  writeFileSync('.token_secret', newSecret)
  process.env.JWT_SECRET = secret
}

export const config = {
  jwtSecret: env('JWT_SECRET'),
  port: +env('PORT', '3001'),
  assetFolder: env('ASSET_FOLDER', resolve(process.cwd(), 'dist', 'assets')),
  db: {
    name: env('DB_NAME', 'pyg'),
    host: env('DB_HOST', ''),
    port: +env('DB_PORT', '27017'),
  },
  kobold: {
    maxLength: +env('KOBOLD_MAX_LENGTH', '200'),
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
  adapters: env('ADAPTERS', 'novel,horde,kobold,chai')
    .split(',')
    .filter((i) => !!i) as AIAdapter[],
}

function env(key: string, fallback?: string): string {
  const value = process.env[key] || fallback || ''

  if (value === undefined) {
    throw new Error(`Required environment variable not set: "${key}"`)
  }

  return value
}

function readSecret() {
  const locations = ['.token_secret', '/run/secrets/jwt_secret']

  for (const loc of locations) {
    try {
      const secret = readFileSync(loc, { encoding: 'utf8' })
      return secret
    } catch (ex) {}
  }
}
