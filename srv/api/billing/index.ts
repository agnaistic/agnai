import { Router } from 'express'
import { loggedIn } from '../auth'
import { finishCheckout, startCheckout } from './checkout'
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

export { router as default }
export { stripe } from './stripe'
