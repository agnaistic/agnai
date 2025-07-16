import { v4 } from 'uuid'
import { db } from './client'
import { AppSchema } from '/common/types'

export async function createImagePreset(userId: string, preset: AppSchema.ImagePreset) {
  const id = v4()
  const next: AppSchema.ImagePreset = {
    _id: id,
    userId,
    kind: 'image-preset',
    cfg: preset.cfg,
    clipSkip: preset.clipSkip,
    description: preset.description,
    draftMode: preset.draftMode,
    height: preset.height,
    name: preset.name,
    providerId: preset.providerId,
    qualityTags: preset.qualityTags,
    sampler: preset.sampler,
    steps: preset.steps,
    ucPreset: preset.ucPreset,
    width: preset.width,
    loras: preset.loras,
    providerModels: preset.providerModels || {},
    seed: preset.seed,
  }

  await db('image-preset').insertOne(next)

  return next
}
