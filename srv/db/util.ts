import bcrypt from 'bcryptjs'

export function now() {
  return new Date().toISOString()
}

export async function encrypt(value: string) {
  const salt = await bcrypt.genSalt()
  const hash = await bcrypt.hash(value, salt)

  return hash
}
