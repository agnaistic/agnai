export type PatreonEvt =
  | { type: 'linked'; userId: string }
  | { type: 'unlinked'; userId: string; reason: string }

export type PatreonCmd =
  | { type: 'link'; userId: string }
  | { type: 'unlink'; userId: string; reason: string }

export type PatreonAgg = {
  userId: string
  history: PatreonEvt[]
}
