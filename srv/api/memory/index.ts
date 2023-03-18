import { Router } from 'express'
import { testBook } from '../../../common/prompt'
import { loggedIn } from '../auth'
import { handle } from '../wrap'

const router = Router()

const getUserBooks = handle(async () => {
  const books = [{ ...testBook }]
  return { books }
})

router.get('/', loggedIn, getUserBooks)

export default router
