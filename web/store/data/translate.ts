import { api, isLoggedIn } from '/web/store/api'
import { getStore } from '/web/store/create'
import { loadItem } from '/web/store/data/storage'
import { TranslationService } from '/common/types/translation-schema'
import { TranslateResponse } from '/srv/translate/types'

type GenerateOpts = {
  chatId: string
  text: string
  service: TranslationService
  to: string
  from?: string
}

export const translateApi = {
  translate,
}

async function translate({ chatId, text, service, to, from }: GenerateOpts) {
  const user = getUserEntity()

  return await api.post<{ data: TranslateResponse }>(`/chat/${chatId}/translate`, {
    user,
    text,
    service,
    to,
    from,
  })
}

function getUserEntity() {
  if (isLoggedIn()) {
    const { user } = getStore('user').getState()
    return user
  }
  return loadItem('config')
}
