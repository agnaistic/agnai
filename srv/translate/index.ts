import { TranslateHandler, TranslateRequest, TranslateResponse } from '/srv/translate/types'
import { TranslationService, TranslationSettings } from '/common/types/translation-schema'
import { googleTranslateHandler } from '/srv/translate/google-translate'
import { AppLog } from '/srv/logger'
import { errors } from '/srv/api/wrap'

export async function translateText({ chatId, ...opts }: TranslateRequest, log: AppLog) {
  const service = getTranslateService(opts.service)

  if (!service) return { output: undefined }

  let translated: TranslateResponse | undefined
  //let error: any

  const text = opts.text
  const from = opts.from
  const to = opts.to
  try {
    translated = await service.translate({ text, from, to })
  } catch (ex: any) {
    log.error({ err: ex }, 'Failed to translate text')
  }

  return { data: translated }
}

export async function translateMessage(
  chatId: string,
  log: AppLog,
  targetLanguage: string,
  text?: string,
  translation?: TranslationSettings
) {
  if (text == null) throw errors.BadRequest

  if (translation == null) return text

  if (translation.direction !== 'none') {
    const translateService = translation.type

    const result = await translateText(
      {
        chatId,
        text,
        service: translateService,
        to: targetLanguage,
      },
      log
    )

    return result?.data != null ? result.data.text : text
  }

  return text
}

export function getTranslateService(
  translateService?: TranslationService
): TranslateHandler | undefined {
  switch (translateService) {
    case 'googletranslate':
      return googleTranslateHandler
    default:
      return
  }
}
