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
  | { type: 'upgraded'; tierId: string; priceId: string }
  | { type: 'downgraded'; tierId: string; priceId: string; activeAt: string }
  /** Only available during a cancellation period */
  | { type: 'resumed' }

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
  | { type: 'cancel' }
  | { type: 'resume' }
  | { type: 'upgrade'; tierId: string; priceId: string }
  | { type: 'downgrade'; tierId: string; priceId: string; activeAt: string }

export type SubsAgg = {
  state: 'active' | 'cancelled' | 'cancelling' | 'new'
  tierId: string
  customerId: string
  subscriptionId: string
  priceId: string
  periodStart: string

  downgrade?: {
    requestedAt: Date
    activeAt: Date
    tierId: string
  }

  history: Array<{ type: string; time: string; tierId?: string }>
}
