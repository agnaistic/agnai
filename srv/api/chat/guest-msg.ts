import { handle } from '../wrap'

export const guestGenerateMsg = handle(async ({ params, body, log, socketId }, res) => {
  return res
    .status(400)
    .json({ message: 'Your browser is running on an old version. Please refresh.' })
})
