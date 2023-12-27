type TranslationType = GoogleTranslate

export type TranslationService = 'googletranslate'

export type GoogleTranslate = {
  type: 'googletranslate'
}

export type TranslateDirections =
  | 'none'
  | 'translate_both'
  | 'translate_inputs'
  | 'translate_responses'

export type TranslationSettings = {
  type: TranslationType['type']
  direction: TranslateDirections
  targetLanguage: string
}
