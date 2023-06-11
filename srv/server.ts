import * as http from 'http'

export function createServer(app: any) {
  return new http.Server(app)
}
