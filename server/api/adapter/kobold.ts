import { AppSchema } from '../../db/schema'

type KoboldRequest = {
  prompt: string
  temperature: number

  /** typical p */
  typical: number

  /** repetition penalty */
  rep_pen: number
}

const base = {
  use_story: false,
  use_memory: false,
  use_authors_note: false,
  use_world_info: false,
  max_context_length: 768, // Tuneable by user?
  do_sample: true,
  /**
   * We deliberately use a low 'max length' to aid with streaming and the lack of support of 'stop tokens' in Kobold.
   *
   */
  max_length: 32,

  // Generation settings -- Can be overriden by the user
  max_new_tokens: 196,
  temperature: 0.5,
  top_p: 0.9,
  top_k: 0,
  typical: 1,
  rep_pen: 1.05,
}

export async function requestChat(character: AppSchema.Character, message: string) {}
