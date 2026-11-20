import type * as ws from 'ws'

export type AppSocket = ws.WebSocket & {
  uid: string
  isAlive: boolean
  misses: number
  userId: string
  token?: string
  appVersion: number
  sha: string
  dispatch: (data: any) => void
}
