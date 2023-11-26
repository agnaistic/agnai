import dotenv from 'dotenv'
import { assertValid } from '/common/valid'
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import { v4 } from 'uuid'
import { ADAPTER_LABELS, AIAdapter } from '../common/adapters'

export type CustomSettings = {
  baseEndTokens?: string[]
}

const settingsValid = {
  baseEndTokens: ['string?'],
} as const

export const customSettings = tryGetSettings()

assertValid(settingsValid, customSettings)

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
  if (secret) {
    process.env.JWT_SECRET = secret
  } else if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error(
      `JWT_SECRET not set and .token_secret file does not exist. One must be provided in production.`
    )
  } else {
    const newSecret = v4()
    const secretPath = process.env.JSON_FOLDER
      ? resolve(process.env.JSON_FOLDER, '.token_secret')
      : '.token_secret'
    writeFileSync(secretPath, newSecret)
    process.env.JWT_SECRET = newSecret
  }
}

export const config = {
  clustering: !!env('CLUSTERING', ''),
  clusterWorkers: +env('CLUSTERING', ''),
  auth: {
    inferenceKey: env('INFERENCE_KEY', ''),
    urls: env('AUTH_URLS', 'https://chara.cards,https://dev.chara.cards')
      .split(',')
      .map((name) => name.trim())
      .filter((name) => !!name.trim()),
    oauth: !!env('OAUTH_ENABLED', ''),
  },
  jwtSecret: env('JWT_SECRET'),
  jwtPrivateKey: env('JWT_PRIVATE_KEY', ''),
  jwtPublicKey: env('JWT_PUBLIC_KEY', ''),
  jwtExpiry: env('JWT_EXPIRY', '30d'),
  port: +env('PORT', '3001'),
  assetFolder: env('ASSET_FOLDER', resolve(__dirname, '..', 'dist', 'assets')),
  extraFolder: env('EXTRA_FOLDER', ''),
  billing: {
    private: env('STRIPE_PRIVATE_KEY', ''),
    public: env('STRIPE_PUBLIC_KEY', ''),
    domains: env('STRIPE_DOMAINS', '')
      .split(',')
      .filter((d) => !!d),
  },
  db: {
    name: env('DB_NAME', 'agnai'),
    host: env('DB_HOST', '127.0.0.1'),
    port: env('DB_PORT', '27017'),
    uri: env('DB_URI', ''),
    verbose: !!env('DB_VERBOSE', ''),
  },
  redis: {
    host: env('REDIS_HOST', '127.0.0.1'),
    port: +env('REDIS_PORT', '6379'),
    user: env('REDIS_USER', ''),
    pass: env('REDIS_PASSWORD', ''),
  },
  limits: {
    upload: +env('IMAGE_SIZE_LIMIT', '10'),
    payload: +env('JSON_SIZE_LIMIT', '10'),
    subRate: +env('SUB_RATE_LIMIT', '15'),
    msgPageSize: +env('MESSAGE_PAGE_SIZE', '500'),
  },
  horde: {
    maxWaitSecs: +env('HORDE_WAIT_SECS', '120'),
    imageWaitSecs: +env('HORDE_IMAGE_WAIT_SECS', '320'),
  },
  classifyUrl: env('CLASSIFY_URL', 'http://localhost:5001'),
  init: {
    username: env('INITIAL_USER', 'admin'),
    password: env('INITIAL_PASSWORD', v4()),
  },
  adapters: env(
    'ADAPTERS',
    'agnaistic,novel,horde,kobold,openai,openrouter,scale,claude,ooba,goose,replicate,mancer'
  )
    .split(',')
    .filter((i) => !!i && i in ADAPTER_LABELS) as AIAdapter[],
  storage: {
    enabled: !!env('USE_S3', ''),
    id: env('AWS_ACCESS_KEY_ID', ''),
    key: env('AWS_SECRET_ACCESS_KEY', ''),
    bucket: env('BUCKET_NAME', ''),
    endpoint: env('BUCKET_ENDPOINT', ''),
    saveImages: !!env('SAVE_IMAGES', ''),
  },
  jsonStorage: !!env('JSON_STORAGE', ''),
  jsonFolder: env('JSON_FOLDER', resolve(__dirname, '..', 'db')),

  ui: {
    maintenance: env('MAINTENANCE', ''),
    patreon: !!env('PATREON', ''),
    policies: !!env('SHOW_POLICIES', ''),
    inject: env('INJECT', ''),
  },

  patreon: {
    redirect: env('PATREON_REDIRECT_URI', 'http://localhost:1234/oauth/patreon'),
    campaign_id: env('PATREON_CAMPAIGN_ID', ''),
    client_id: env('PATREON_CLIENT_ID', ''),
    client_secret: env('PATREON_CLIENT_SECRET', ''),
    access_token: env('PATREON_ACCESS_TOKEN', ''),
    refresh_token: env('PATREON_REFRESH_TOKEN', ''),
  },

  inference: {
    flatChatCompletion: !!env('SIMPLE_COMPLETION', ''),
  },
  keys: {
    REPLICATE: env('REPLICATE_KEY', ''),
  },
  pipelineProxy: !!env('PIPELINE_PROXY', ''),
  publicTunnel: !!env('PUBLIC_TUNNEL', ''),
}

insertInject()

if (config.ui.inject) {
  const tags = ['<meta inject="">', '<meta inject>']

  for (const tag of tags) {
    const indexFile = resolve(__dirname, '../dist/index.html')
    const index = readFileSync(indexFile).toString()
    if (index.includes(tag)) {
      writeFileSync(indexFile, index.replace(tag, config.ui.inject))
      break
    }
  }
}

if (config.jwtPrivateKey) {
  try {
    const file = readFileSync(config.jwtPrivateKey).toString('utf-8')
    config.jwtPrivateKey = file
  } catch {}
}

function env(key: string, fallback?: string): string {
  const value = process.env[key] || fallback || ''

  if (value === undefined) {
    throw new Error(`Required environment variable not set: "${key}"`)
  }

  if (value.startsWith('/run/secrets/')) {
    try {
      const content = readFileSync(value, 'utf-8').toString().trim()
      return content
    } catch (ex) {
      throw new Error(`Required environment secret not available: ${value}`)
    }
  }

  return value
}

function readSecret() {
  const locations = ['.token_secret', '/run/secrets/jwt_secret']
  if (process.env.JSON_FOLDER) {
    locations.unshift(resolve(process.env.JSON_FOLDER, '.token_secret'))
  }

  for (const loc of locations) {
    try {
      const secret = readFileSync(loc, { encoding: 'utf8' })
      return secret
    } catch (ex) {}
  }
}

function tryGetSettings(): CustomSettings {
  try {
    const settings = require('../settings.json')
    return settings
  } catch (ex) {
    return {}
  }
}

/** @deprecated */
function insertInject() {
  if (config.ui.inject) {
    const tags = ['<meta inject="">', '<meta inject>']

    for (const tag of tags) {
      const indexFile = resolve(__dirname, '../dist/index.html')
      const index = readFileSync(indexFile).toString()
      if (index.includes(tag)) {
        writeFileSync(indexFile, index.replace(tag, config.ui.inject))
        break
      }
    }
  }
}
