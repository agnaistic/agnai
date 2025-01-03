import { AppSchema } from './types'
import { ImageModel } from './types/admin'

export function filterImageModels(
  user: AppSchema.User,
  models: ImageModel[],
  tier?: Pick<AppSchema.SubscriptionTier, 'imagesAccess'>
) {
  if (user?.admin) return models

  const list = models.map((m) => ({ ...m, override: '', host: '' }))
  return list
}
