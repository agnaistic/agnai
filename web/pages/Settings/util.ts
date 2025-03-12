import { AppSchema } from '/common/types'

export type UserSettings = ReturnType<typeof toUserStoreObject>

export function toUserStoreObject(user: AppSchema.User) {
  const keys = [
    'disableLTM',
    'defaultPreset',
    'claudeApiKey',
    'claudeApiKeySet',
    'hordeModel',
    'hordeWorkers',
    'hordeName',
    'hordeUseTrusted',
    'hordeKey',
    'koboldUrl',
    'thirdPartyFormat',
    'thirdPartyPassword',
    'thirdPartyPasswordSet',
    'arliApiKey',
    'arliApiKeySet',
    'mistralKey',
    'mistralKeySet',
    'featherlessApiKey',
    'featherlessApiKeySet',
    'novelApiKey',
    'novelVerified',
    'novelModel',
    'oobaUrl',
    'oaiKey',
    'oaiKeySet',
    'adapterConfig',
    'scaleUrl',
    'scaleApiKey',
    'scaleApiKeySet',
    'elevenLabsApiKey',
    'elevenLabsApiKeySet',
    'speechtotext',
    'texttospeech',
  ] satisfies Array<keyof AppSchema.User>

  const obj: any = {} as any

  for (const key of keys) {
    obj[key] = user[key] as any | never
  }

  return obj as { [K in (typeof keys)[number]]: AppSchema.User[K] }
}
