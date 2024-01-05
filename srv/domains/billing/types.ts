import Stripe from 'stripe'

export type BillingCmd =
  | {
      type: 'request'
      userId: string
      tierId: string
      sessionId: string
      productId: string
      priceId: string
    }
  | { type: 'success'; userId: string; session: any; tier: any }
  | { type: 'cancel'; userId: string }
  | { type: 'fail'; userId: string; reason?: string; session?: any }

export type BillingEvt =
  | {
      type: 'requested'
      userId: string
      tierId: string
      sessionId: string
      productId: string
      priceId: string
    }
  | { type: 'succesful'; session: Stripe.Checkout.Session; tier: any; userId: string }
  | { type: 'cancelled' }
  | { type: 'failed'; reason?: string; session?: Stripe.Checkout.Session }

export type BillingAgg = {
  state: 'new' | 'request' | 'success' | 'fail' | 'cancel'
  sessionId: string
  productId: string
  priceId: string
  tierId: string
  userId: string
  session?: Stripe.Checkout.Session
}
