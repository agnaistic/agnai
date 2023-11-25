import needle from 'needle'
import { config } from '/srv/config'
import { StatusError } from '../wrap'
import { AppSchema, Patreon } from '/common/types'
import { getCachedTiers } from '/srv/db/subscriptions'
import { store } from '/srv/db'

export const patreon = {
  authorize,
  identity,
  revalidatePatron,
  initialVerifyPatron,
}

async function authorize(code: string, refresh?: boolean) {
  const form = new URLSearchParams()
  form.append('code', code)
  form.append('redirect_uri', config.patreon.redirect)
  form.append('client_id', config.patreon.client_id)
  form.append('client_secret', config.patreon.client_secret)
  form.append('grant_type', refresh ? 'refresh_token' : 'authorization_code')

  if (refresh) {
    form.append('refresh_token', code)
  }

  const result = await needle('post', `https://www.patreon.com/api/oauth2/token`, form, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  })

  if (result.statusCode && result.statusCode > 200) {
    throw new StatusError(`Unable to verify Patreon account`, 400)
  }

  const user: Patreon.Authorize = result.body
  return user
}

const memberProps = [
  'patron_status',
  'last_charge_date',
  'last_charge_status',
  'next_charge_date',
  'currently_entitled_amount_cents',
  'pledge_relationship_start',
  'campaign_lifetime_support_cents',
  'will_pay_amount_cents',
]

const identityKeys = [
  `fields[user]=created,email,full_name`,
  `include=memberships.currently_entitled_tiers.campaign`,
  `fields[member]=${memberProps.join(',')}`,
  `fields[tier]=amount_cents,title,description`,
  `fields[campaign]=url,vanity`,
]

async function identity(token: string) {
  const query = encodeURI(identityKeys.join('&'))
  const identity = await needle('get', `https://www.patreon.com/api/oauth2/v2/identity?${query}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (identity.statusCode && identity.statusCode > 200) {
    throw new StatusError(`Failed to get Patreon user information`, identity.statusCode)
  }

  const user: Patreon.User = identity.body.data
  const tier: Patreon.Tier | undefined = identity.body.included?.find((obj: Patreon.Include) => {
    if (obj.type !== 'tier') return false
    return obj.relationships.campaign?.data?.id === config.patreon.campaign_id
  })

  if (!tier) return { user }

  const contrib = tier.attributes.amount_cents / 100
  const sub = getCachedTiers().reduce((prev, curr) => {
    if (!curr.enabled || !curr.deletedAt) return prev
    if (!curr.patreonThreshold || curr.patreonThreshold <= 0) return prev
    if (curr.patreonThreshold > contrib) return prev

    if (!prev) return curr
    if (prev.patreonThreshold > curr.patreonThreshold) return prev
    return curr
  })

  return { tier, sub, user }
}

async function revalidatePatron(userId: string) {
  const user = await store.users.getUser(userId)
  if (!user?.patreon) {
    throw new StatusError(`Patreon account is not linked`, 400)
  }

  /**
   * Token refreshing
   */
  const now = new Date().toISOString()
  if (user.patreon.expires <= now) {
    const token = await authorize(user.patreon.refresh_token, true)
    const next: AppSchema.User['patreon'] = {
      ...user.patreon,
      ...token,
      expires: new Date(Date.now() + token.expires_in * 1000).toISOString(),
    }
    await store.users.updateUser(userId, { patreon: next })
    user.patreon = next
  }

  const patron = await identity(user.patreon.access_token)

  const existing = await store.users.findByPatreonUserId(patron.user.id)
  if (existing && existing._id !== userId) {
    throw new StatusError(`This Patreon account is already attributed to another user`, 400)
  }

  const next = await store.users.updateUser(userId, {
    patreon: {
      ...user.patreon,
      user: patron.user,
      sub: patron.sub ? { tierId: patron.sub._id, level: patron.sub.level } : undefined,
    },
    patreonUserId: patron.user.id,
  })

  return next
}

async function initialVerifyPatron(userId: string, code: string) {
  const token = await patreon.authorize(code)
  const patron = await identity(token.access_token)

  const existing = await store.users.findByPatreonUserId(patron.user.id)
  if (existing && existing._id !== userId) {
    throw new StatusError(`This Patreon account is already attributed to another user`, 400)
  }

  const next = await store.users.updateUser(userId, {
    patreon: {
      ...token,
      expires: new Date(Date.now() + token.expires_in * 1000).toISOString(),
      user: patron.user,
      sub: patron.sub ? { tierId: patron.sub._id, level: patron.sub.level } : undefined,
    },
    patreonUserId: patron.user.id,
  })

  return next
}
