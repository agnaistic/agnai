import { AppSchema } from '../../db/schema'

type KoboldRequest = {
  prompt: string
  temperature: number
  typical: number
  rep_pen: number
}

const base = {
  use_story: false,
  use_memory: false,
  use_authors_note: false,
  use_world_info: false,
  max_context_length: 2048,
}

export async function requestChat(character: AppSchema.Character, message: string) {}
