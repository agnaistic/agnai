import { Router } from 'express'
import { store } from '../db'
import { handle } from './wrap'
import { assertValid } from '/common/valid'
import { isAdmin } from './auth'

const valid = {
  title: 'string',
  content: 'string',

  showAt: 'string',
  hide: 'boolean',

  deletedAt: 'string?',
} as const

const getPublicAnnouncements = handle(async () => {
  const announcements = await store.announce.getAnnouncements()
  return { announcements }
})

const getAdminAnnouncements = handle(async () => {
  const announcements = await store.announce.getAdminAnnouncements()
  return { announcements }
})

const updateAnnouncement = handle(async (req) => {
  const id = req.params.id
  assertValid(valid, req.body, true)

  const next = await store.announce.updateAnnouncement(id, req.body)
  return next
})

const createAnnouncement = handle(async (req) => {
  assertValid(valid, req.body)
  const next = await store.announce.createAnnouncement(req.body)
  return next
})

const router = Router()
router.get('/', getPublicAnnouncements)
router.get('/admin', isAdmin, getAdminAnnouncements)
router.post('/:id', isAdmin, updateAnnouncement)
router.post('/', isAdmin, createAnnouncement)

export { router as default }
