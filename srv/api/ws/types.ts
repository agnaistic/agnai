import * as WebSocket from 'ws'

export type AppSocket = WebSocket & {
  uid: string
  isAlive: boolean
  misses: number
  userId: string
  token?: string
  appVersion: number
  sha: string
  dispatch: (data: any) => void
}
