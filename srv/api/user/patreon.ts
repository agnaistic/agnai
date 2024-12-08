import needle from 'needle'
import { config } from '/srv/config'
import { StatusError } from '../wrap'
import { AppSchema, Patreon } from '/common/types'
import { getCachedTiers } from '/srv/db/subscriptions'
import { store } from '/srv/db'
import { command } from '/srv/domains'
import { sendOne } from '../ws'
import { getPatreonEntitledTierByCost } from '/common/util'
import { logger } from '/srv/middleware'

export const patreon = {
  authorize,
  identity,
  revalidatePatron,
  initialVerifyPatron,
  getCampaignTiers,
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
    logger.error(
      { result: result.body, status: result.statusCode, message: result.statusMessage },
      'Patreon validation failed'
    )
    throw new StatusError(`Unable to verify Patreon account`, 400)
  }

  const user: Patreon.Authorize = result.body
  return user
}

const memberProps = [
  'patron_status',
  'last_charge_date',
  'is_gifted',
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
    throw new StatusError(`Failed to get Patreon user information (${identity.statusCode})`, 400)
  }

  const user: Patreon.User = identity.body.data
  const tiers: Patreon.Tier[] =
    identity.body.included?.filter((obj: Patreon.Include) => {
      if (obj.type !== 'tier') return false
      return obj.relationships?.campaign?.data?.id === config.patreon.campaign_id
    }) || []

  const tier = tiers.length
    ? tiers.reduce<Patreon.Tier | undefined>((prev, curr) => {
        if (!prev) return curr
        return curr.attributes.amount_cents > prev.attributes.amount_cents ? curr : prev
      }, undefined)
    : undefined

  if (!tier) return { user }

  const member = identity.body.included?.find((obj: Patreon.Include) => {
    if (obj.type !== 'member') return false
    const match = obj.relationships.currently_entitled_tiers?.data?.some((d) => d.id === tier.id)
    return match
  })

  let contrib = tier.attributes.amount_cents
  if (!contrib) {
  }
  const sub = getPatreonEntitledTierByCost(contrib, getCachedTiers())

  return { tier, sub, user, member }
}

async function revalidatePatron(userId: string | AppSchema.User) {
  const user = typeof userId === 'string' ? await store.users.getUser(userId) : userId
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
    await store.users.updateUser(user._id, { patreon: next })
    user.patreon = next
  }

  const patron = await identity(user.patreon.access_token)

  const existing = await store.users.findByPatreonUserId(patron.user.id)
  if (existing && existing._id !== user._id) {
    sendOne(user._id, {
      type: 'notification',
      level: 'warn',
      message:
        'Your patreon account was already assigned to an account. It has been unlinked from that account.',
      ttl: 20,
    })

    await store.users.unlinkPatreonAccount(existing._id, `attributing to user ${user._id}`)
  }

  const next = await store.users.updateUser(user._id, {
    patreon: {
      ...user.patreon,
      user: patron.user,
      member: patron.member,
      tier: patron.tier,
      sub: patron.sub ? { tierId: patron.sub._id, level: patron.sub.level } : undefined,
    },
    patreonUserId: patron.user.id,
  })
  await command.patron.link(patron.user.id, { userId: user._id })
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
      member: patron.member,
      tier: patron.tier,
      sub: patron.sub ? { tierId: patron.sub._id, level: patron.sub.level } : undefined,
    },
    patreonUserId: patron.user.id,
  })

  return next
}

async function getCampaignTiers() {
  const query = ['include=tiers', 'fields[tier]=amount_cents,title,description'].join('&')
  const res = await needle(
    'get',
    `https://www.patreon.com/api/oauth2/v2/campaigns/${config.patreon.campaign_id}?${encodeURI(
      query
    )}`,
    {
      headers: {
        Authorization: `Bearer ${config.patreon.access_token}`,
      },
    }
  )

  if (res.statusCode && res.statusCode > 200) {
    return []
  }

  return res.body.included as Array<Omit<Patreon.Tier, 'relationships'>>
}
