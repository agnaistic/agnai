import { AppSchema } from './types'
import { ImageModel } from './types/admin'

export function filterImageModels(
  user: AppSchema.User,
  models: ImageModel[],
  tier?: Pick<AppSchema.SubscriptionTier, 'imagesAccess'>
) {
  if (user?.admin) return models
  if (!tier?.imagesAccess) return []

  let level = Math.max(user?.sub?.level ?? 0, 0)

  const list = models
    .filter((m) => (m.level ?? 0) <= level)
    .map((m) => ({ ...m, override: '', host: '' }))
  return list
}
