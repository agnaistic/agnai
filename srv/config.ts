import dotenv from 'dotenv'

dotenv.config({ path: '.env' })

export const config = {
  port: +env('PORT', '3001'),
  db: {
    name: env('DB_NAME', 'pyg'),
  },
}

function env(key: string, fallback?: string): string {
  const value = process.env[key] || fallback || ''

  if (!value) {
    throw new Error(`Required environment variable not set: "${key}"`)
  }

  return value
}
