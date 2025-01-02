import { v4 } from 'uuid'
import { db } from './client'
import { AppSchema } from '../../common/types/schema'
import { StatusError } from '../api/wrap'
import { now } from './util'
import { sendAll } from '../api/ws'
import { setContextLimitStrategy } from '/common/prompt'
import { getSubscriptionModelLimits, getUserSubscriptionTier } from '/common/util'

const subCache = new Map<string, AppSchema.SubscriptionModel>()
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

export async function createSubscription(settings: Partial<AppSchema.SubscriptionModel>) {
  const preset = {
    _id: v4(),
    kind: 'subscription-setting',
    ...settings,
  } as AppSchema.SubscriptionModel

  await db('subscription-setting').insertOne(preset)

  if (preset.isDefaultSub) {
    await db('subscription-setting').updateMany(
      { _id: { $ne: preset._id } },
      { $set: { isDefaultSub: false } }
    )
  }

  const option = toModelOption(preset)
  sendAll({ type: 'submodel-updated', model: option })

  return preset
}

export async function updateSubscription(id: string, update: Partial<AppSchema.SubscriptionModel>) {
  await db('subscription-setting').updateOne({ _id: id }, { $set: update }, { upsert: false })

  if (update.isDefaultSub) {
    await db('subscription-setting').updateMany(
      { _id: { $ne: id } },
      { $set: { isDefaultSub: false } }
    )
  }

  const preset = await db('subscription-setting').findOne({ _id: id })

  if (preset) {
    const option = toModelOption(preset)
    sendAll({ type: 'submodel-updated', model: option })
  }

  return preset
}

export async function deleteSubscription(id: string) {
  await db('subscription-setting').updateOne(
    { _id: id },
    { $set: { deletedAt: new Date().toISOString() } }
  )
}

export function getCachedSubscriptionModels() {
  const all = Array.from(subCache.values())
  return all.filter((sub) => !sub.subDisabled && !sub.deletedAt)
}

export function getCachedSubscriptions() {
  const all = Array.from(subCache.values())

  const subs = all
    .filter((sub) => !sub.subDisabled)
    .map<AppSchema.SubscriptionModelOption>(toModelOption)
    .sort((l, r) => (l.level === r.level ? l.name.localeCompare(r.name) : l.level - r.level))

  return subs
}

export function toModelOption(sub: AppSchema.SubscriptionModel): AppSchema.SubscriptionModelOption {
  return {
    _id: sub._id,
    name: `${sub.name}`,
    level: sub.subLevel,
    service: sub.service!,
    guidance: !!sub.guidanceCapable,
    preset: {
      kind: 'submodel',
      service: sub.service,
      _id: sub._id,
      tokenHealing: sub.tokenHealing,
      mirostatToggle: sub.mirostatToggle,
      streamResponse: sub.streamResponse,
      name: sub.name,
      description: sub.description,
      isDefaultSub: sub.isDefaultSub,
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
      subDisabled: sub.subDisabled,
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
      allowGuestUsage: sub.allowGuestUsage,
      dynatemp_exponent: sub.dynatemp_exponent,
      dynatemp_range: sub.dynatemp_range,
      modelFormat: sub.modelFormat,
      penaltyAlpha: sub.penaltyAlpha,
      smoothingCurve: sub.smoothingCurve,
      smoothingFactor: sub.smoothingFactor,
      skipSpecialTokens: sub.skipSpecialTokens,
      tempLast: sub.tempLast,
      levels: sub.levels || [],
      subLevel: sub.subLevel,
    },
  }
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

    if (presets.length > 0) {
      subCache.clear()
      for (const preset of presets) {
        subCache.set(preset._id, preset)
      }
    }
  } catch (ex) {}
}

setContextLimitStrategy((user, gen) => {
  if (!gen) return
  if (gen.service !== 'agnaistic') return

  const sub = getUserSubscriptionTier(user, getCachedTiers())
  const level = user.admin ? Infinity : sub?.level ?? -1

  const tierId = gen.registered?.agnaistic?.subscriptionId || ''
  const tier = subCache.get(tierId)

  if (!tier) return

  const limits = getSubscriptionModelLimits(tier, level)
  if (!limits) return

  return { context: limits.maxContextLength, tokens: limits.maxTokens }
})

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
