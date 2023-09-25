import Stripe from 'stripe'
import { config } from '/srv/config'

export const stripe = new Stripe(config.billing.private, { apiVersion: '2023-08-16' })
