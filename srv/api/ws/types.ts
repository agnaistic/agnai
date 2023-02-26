import * as WebSocket from 'ws'

export type AppSocket = WebSocket & {
  isAlive: boolean
  userId: string
  token?: string
  dispatch: (data: any) => void
}
