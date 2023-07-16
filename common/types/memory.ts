export type UserEmbed<T = {}> = {
  id: string
  distance: number
  text: string
  date: string
} & T

export type ChatEmbed = { _id: string; msg: string; name: string; createdAt: string }
