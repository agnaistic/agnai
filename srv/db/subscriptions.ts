import { v4 } from 'uuid'
import { db } from './client'
import { AppSchema } from '../../common/types/schema'
import { StatusError } from '../api/wrap'
import { now } from './util'

const subCache = new Map<string, AppSchema.SubscriptionPreset>()
const tierCache = new Map<string, AppSchema.SubscriptionTier>()

export async function getSubscriptions() {
  const subs = await db('subscription-setting')
    .find({ deletedAt: { $exists: false } })
    .toArray()
  return subs
}

export async function getSubscription(id: string) {
  const sub = await db('subscription-setting').findOne({ _id: id })
  return sub ? sub : undefined
}

export async function getDefaultSubscription() {
  const sub = await db('subscription-setting').findOne({ isDefaultSub: true })
  return sub ? sub : undefined
}

export async function createSubscription(settings: Partial<AppSchema.SubscriptionPreset>) {
  const preset = {
    _id: v4(),
    kind: 'subscription-setting',
    ...settings,
  } as AppSchema.SubscriptionPreset

  await db('subscription-setting').insertOne(preset)

  if (preset.isDefaultSub) {
    await db('subscription-setting').updateMany(
      { _id: { $ne: preset._id } },
      { $set: { isDefaultSub: false } }
    )
  }

  return preset
}

export async function updateSubscription(
  id: string,
  update: Partial<AppSchema.SubscriptionPreset>
) {
  await db('subscription-setting').updateOne({ _id: id }, { $set: update }, { upsert: false })

  if (update.isDefaultSub) {
    await db('subscription-setting').updateMany(
      { _id: { $ne: id } },
      { $set: { isDefaultSub: false } }
    )
  }

  const preset = await db('subscription-setting').findOne({ _id: id })

  return preset
}

export async function deleteSubscription(id: string) {
  await db('subscription-setting').updateOne(
    { _id: id },
    { $set: { deletedAt: new Date().toISOString() } }
  )
}

export function getCachedSubscriptionPresets() {
  const all = Array.from(subCache.values())
  return all.filter((sub) => !sub.subDisabled && !sub.deletedAt)
}

export function getCachedSubscriptions(user?: AppSchema.User | null) {
  const all = Array.from(subCache.values())

  const subs = all
    .filter((sub) => !sub.subDisabled)
    .map<AppSchema.SubscriptionOption>((sub) => ({
      _id: sub._id,
      name: `${sub.name}`,
      level: sub.subLevel,
      service: sub.service!,
      guidance: !!sub.guidanceCapable,
      preset: {
        name: sub.name,
        maxContextLength: sub.maxContextLength,
        maxTokens: sub.maxTokens,
        frequencyPenalty: sub.frequencyPenalty,
        presencePenalty: sub.presencePenalty,
        repetitionPenalty: sub.repetitionPenalty,
        repetitionPenaltyRange: sub.repetitionPenaltyRange,
        repetitionPenaltySlope: sub.repetitionPenaltySlope,
        tailFreeSampling: sub.tailFreeSampling,
        temp: sub.temp,
        topA: sub.topA,
        topK: sub.topK,
        topP: sub.topP,
        minP: sub.minP,
        typicalP: sub.typicalP,
        addBosToken: sub.addBosToken,
        antiBond: sub.antiBond,
        banEosToken: sub.banEosToken,
        cfgOppose: sub.cfgOppose,
        cfgScale: sub.cfgScale,
        doSample: sub.doSample,
        earlyStopping: sub.earlyStopping,
        encoderRepitionPenalty: sub.encoderRepitionPenalty,
        mirostatLR: sub.mirostatLR,
        mirostatTau: sub.mirostatTau,
      },
    }))
    .sort((l, r) => (l.level === r.level ? l.name.localeCompare(r.name) : l.level - r.level))

  return subs
}

export function getCachedTiers() {
  const tiers = Array.from(tierCache.values())
  return tiers
}

setInterval(async () => {
  await Promise.all([prepSubscriptionCache().catch(() => null), prepTierCache().catch(() => null)])
}, 5000)

export async function prepSubscriptionCache() {
  try {
    const presets = await getSubscriptions()
    subCache.clear()
    for (const preset of presets) {
      subCache.set(preset._id, preset)
    }
  } catch (ex) {}
}

export async function prepTierCache() {
  try {
    const tiers = await getTiers()
    tierCache.clear()
    for (const tier of tiers) {
      tierCache.set(tier._id, tier)
    }
  } catch (ex) {}
}

export async function getTiers() {
  const tiers = await db('subscription-tier')
    .find({ deletedAt: { $exists: false } })
    .toArray()
  return tiers
}

export async function getTier(id: string) {
  const tier = await db('subscription-tier').findOne({ _id: id })

  if (!tier) {
    throw new StatusError(`Tier not found`, 404)
  }

  return tier
}

export async function createTier(
  create: OmitId<AppSchema.SubscriptionTier, 'createdAt' | 'deletedAt' | 'updatedAt' | 'kind'>
) {
  const id = v4()
  const tier: AppSchema.SubscriptionTier = {
    kind: 'subscription-tier',
    createdAt: now(),
    updatedAt: now(),
    ...create,
    _id: id,
  }

  await db('subscription-tier').insertOne(tier)

  return tier
}

export async function updateTier(id: string, update: Partial<AppSchema.SubscriptionTier>) {
  update.updatedAt = now()
  const res = await db('subscription-tier').updateOne({ _id: id }, { $set: update })

  if (res.modifiedCount === 0) {
    throw new StatusError(`Tier does not exist`, 404)
  }

  const next = await getTier(id)
  return next
}

export async function replaceSubscription(id: string, replacementId: string) {
  const original = await getSubscription(id)
  const replacement = await getSubscription(replacementId)

  if (!original || !replacement) {
    throw new StatusError('Replacement subscription not found', 404)
  }

  if (replacement.subDisabled || replacement.deletedAt) {
    throw new StatusError('Cannot replace tier with disabled/deleted subscription', 400)
  }

  await db('gen-setting').updateMany(
    { 'registered.agnaistic.subscriptionId': id },
    { $set: { 'registered.agnaistic.subscriptionId': replacementId } }
  )
  await updateSubscription(id, { subDisabled: true })
}
