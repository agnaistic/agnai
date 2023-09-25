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
  | { type: 'fail'; userId: string }

export type BillingEvt =
  | {
      type: 'requested'
      userId: string
      tierId: string
      sessionId: string
      productId: string
      priceId: string
    }
  | { type: 'succesful'; session: any; tier: any }
  | { type: 'cancelled' }
  | { type: 'failed' }

export type BillingAgg = {
  state: 'new' | 'request' | 'success' | 'fail' | 'cancel'
  sessionId: string
  productId: string
  priceId: string
  tierId: string
  userId: string
}
