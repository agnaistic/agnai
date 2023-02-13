import { createStore } from './create'

type ChatState = {
  id: string
  msgs: Msg[]
  actors: Actor[]
}

type Msg = {
  from: string
  content: string
}

type Actor = {
  img: string
  name: string
}

export const chatStore = createStore<ChatState>('chat', {
  id: '',
  msgs: [],
  actors: [],
})((get, set) => {
  return {
    async send(_, name: string, content: string) {},
  }
})
