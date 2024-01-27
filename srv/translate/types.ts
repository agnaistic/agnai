import { TranslationService } from '/common/types/translation-schema'

export type TranslateRequest = {
  text: string
  from?: string
  to: string
  service: TranslationService
  chatId: string
}

export type TranslateResponse = {
  service: TranslationService
  text: string
  originalText: string
}

export type TranslateAdapter = (opts: {
  text: string
  from?: string
  to: string
}) => Promise<TranslateResponse>

export type TranslateHandler = {
  translate: TranslateAdapter
}
