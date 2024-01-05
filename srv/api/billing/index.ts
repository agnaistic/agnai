import { Router } from 'express'
import { isAdmin, loggedIn } from '../auth'
import { finishCheckout, manualSubscribe, startCheckout, viewSession } from './checkout'
import { cancelSubscription } from './cancel'
import { modifySubscription, subscriptionStatus, verifySubscription } from './modify'
import { resumeSubscription } from './resume'

const router = Router()
router.use(loggedIn)
router.post('/checkout', startCheckout)
router.post('/finish', finishCheckout)
router.post('/cancel', cancelSubscription)
router.post('/modify', modifySubscription)
router.post('/verify', verifySubscription)
router.post('/resume', resumeSubscription)
router.get('/status', subscriptionStatus)
router.post('/admin-manual', isAdmin, manualSubscribe)
router.post('/session', isAdmin, viewSession)

export { router as default }
export { stripe } from './stripe'
