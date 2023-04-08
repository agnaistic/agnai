import { Router } from 'express'
import { readFile } from 'fs/promises'
import { resolve } from 'path'
import { handle } from '../wrap'

const load = handle(async (req) => {
  const [user, profile, chars, presets, memory] = await Promise.all([
    read('user.json'),
    read('profile.json'),
    read('characters.json'),
    read('presets.json'),
    read('memory.json'),
  ])

  return {
    user,
    profile,
    chars,
    presets,
    memory,
  }
})

const save = handle(async ({ params, body }) => {})

const router = Router()

router.get('/', load)
router.post('/:kind', save)

export default router

async function read(file: string) {
  const content = await readFile(resolve(__dirname, 'db', file)).catch(() => null)
  if (!content) return
  try {
    const json = JSON.parse(content.toString())
    return json
  } catch (ex) {}
}
