import Stripe from 'stripe'

export type SubsEvt =
  | {
      type: 'subscribed'
      tierId: string
      customerId: string
      subscriptionId: string
      priceId: string
      periodStart: string
    }
  | { type: 'cancelled' }
  | { type: 'cancelled-duplicate'; subscriptionId: string; replacementId?: string }
  | { type: 'upgraded'; tierId: string; priceId: string }
  | { type: 'downgraded'; tierId: string; priceId: string; activeAt: string }
  | { type: 'session-started'; sessionId: string; tierId: string }
  /** Only available during a cancellation period */
  | { type: 'resumed' }
  /** Manually assign a subscription ID to a user in the case of a failed update */
  | {
      type: 'admin-subscribe'
      tierId: string
      customerId: string
      subscriptionId: string
      priceId: string
      periodStart: string
    }
  | { type: 'admin-manual'; tierId: string; expiresAt: string; byAdminId: string }

export type SubsCmd =
  | {
      type: 'subscribe'
      tierId: string
      customerId: string
      subscriptionId: string
      priceId: string
      productId: string
      subscription: Stripe.Subscription
    }
  | { type: 'cancelDuplicate'; subscriptionId: string; replacementId?: string }
  | { type: 'cancel' }
  | { type: 'resume' }
  | { type: 'upgrade'; tierId: string; priceId: string }
  | { type: 'downgrade'; tierId: string; priceId: string; activeAt: string }
  | { type: 'startSession'; sessionId: string; tierId: string }
  | {
      type: 'adminSubscribe'
      tierId: string
      subscriptionId: string
      customerId: string
      priceId: string
      productId: string
      subscription: Stripe.Subscription
    }
  | { type: 'adminManual'; tierId: string; expiresAt: string; byAdminId: string }

export type SubsAgg = {
  state: 'active' | 'cancelled' | 'cancelling' | 'new'
  tierId: string
  customerId: string
  subscriptionId: string
  priceId: string
  periodStart: string
  sessions: string[]

  downgrade?: {
    requestedAt: Date
    activeAt: Date
    tierId: string
  }

  history: Array<{ type: string; time: string; tierId?: string; subscriptionId?: string }>
}
