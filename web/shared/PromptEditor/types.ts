export type Placeholder = {
  required: boolean
  limit: number
  inserted?: string
}

export type Interp = keyof typeof placeholders
export type InterpV2 = keyof typeof v2placeholders
export type InterpAll = Interp | InterpV2

export type Optionals = { exclude: InterpAll[] } | { include: InterpAll[] } | {}

export const placeholders = {
  char: { required: false, limit: Infinity },
  user: { required: false, limit: Infinity },
  chat_age: { required: false, limit: Infinity },
  idle_duration: { required: false, limit: Infinity },
  system_prompt: { required: false, limit: 1 },
  history: { required: true, limit: 1 },
  scenario: { required: true, limit: 1 },
  memory: { required: false, limit: 1 },
  personality: { required: true, limit: 1 },
  ujb: { required: false, limit: 1 },
  post: { required: true, limit: 1 },
  example_dialogue: { required: true, limit: 1 },
  all_personalities: { required: false, limit: 1 },
  impersonating: { required: false, limit: 1 },
  longterm_memory: { required: false, limit: 1 },
  user_embed: { required: false, limit: 1 },
} satisfies Record<string, Placeholder>

export const v2placeholders = {
  roll: { required: false, limit: Infinity, inserted: 'roll 20' },
  random: { required: false, limit: Infinity, inserted: 'random: a,b,c' },
  insert: { required: false, limit: Infinity, inserted: `#insert 3}} {{/insert` },
  'each message': { required: false, limit: 1, inserted: `#each msg}} {{/each` },
  'each bot': { required: false, limit: 1, inserted: `#each bot}} {{/each` },
  'each chat_embed': { required: false, limit: 1, inserted: `#each chat_embed}} {{/each` },
  lowpriority: { required: false, limit: Infinity, inserted: `#lowpriority}} {{/lowpriority` },
} satisfies Record<string, Placeholder>
