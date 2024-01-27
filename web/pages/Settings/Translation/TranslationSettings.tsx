import { userStore } from '/web/store'
import { Component, createMemo, createSignal } from 'solid-js'
import Tabs from '../../../shared/Tabs'
import Divider from '../../../shared/Divider'
import Select from '/web/shared/Select'
import GoogleTranslateSettings from './GoogleTranslateSettings'

const translateServiceTabs = {
  googletranslate: 'Google Translate',
}

type Tab = keyof typeof translateServiceTabs

const translationDirections = [
  { label: 'None', value: 'none' },
  { label: 'Translate both', value: 'translate_both' },
  { label: 'Translate inputs', value: 'translate_inputs' },
  { label: 'Translate outputs', value: 'translate_outputs' },
]

const translationTypes = [{ label: 'Google', value: 'googletranslate' }]

const languageCodes = [
  { label: 'Afrikaans', value: 'af' },
  { label: 'Albanian', value: 'sq' },
  { label: 'Amharic', value: 'am' },
  { label: 'Arabic', value: 'ar' },
  { label: 'Armenian', value: 'hy' },
  { label: 'Azerbaijani', value: 'az' },
  { label: 'Basque', value: 'eu' },
  { label: 'Belarusian', value: 'be' },
  { label: 'Bengali', value: 'bn' },
  { label: 'Bosnian', value: 'bs' },
  { label: 'Bulgarian', value: 'bg' },
  { label: 'Catalan', value: 'ca' },
  { label: 'Cebuano', value: 'ceb' },
  { label: 'Chinese (Simplified)', value: 'zh-CN' },
  { label: 'Chinese (Traditional)', value: 'zh-TW' },
  { label: 'Corsican', value: 'co' },
  { label: 'Croatian', value: 'hr' },
  { label: 'Czech', value: 'cs' },
  { label: 'Danish', value: 'da' },
  { label: 'Dutch', value: 'nl' },
  { label: 'English', value: 'en' },
  { label: 'Esperanto', value: 'eo' },
  { label: 'Estonian', value: 'et' },
  { label: 'Finnish', value: 'fi' },
  { label: ' French', value: 'fr' },
  { label: 'Frisian', value: 'fy' },
  { label: 'Galician', value: 'gl' },
  { label: 'Georgian', value: 'ka' },
  { label: 'German', value: 'de' },
  { label: 'Greek', value: 'el' },
  { label: 'Gujarati', value: 'gu' },
  { label: 'Haitian Creole', value: 'ht' },
  { label: 'Hausa', value: 'ha' },
  { label: 'Hawaiian', value: 'haw' },
  { label: 'Hebrew', value: 'iw' },
  { label: 'Hindi', value: 'hi' },
  { label: 'Hmong', value: 'hmn' },
  { label: 'Hungarian', value: 'hu' },
  { label: 'Icelandic', value: 'is' },
  { label: 'Igbo', value: 'ig' },
  { label: 'Indonesian', value: 'id' },
  { label: 'Irish', value: 'ga' },
  { label: 'Italian', value: 'it' },
  { label: 'Japanese', value: 'ja' },
  { label: 'Javanese', value: 'jw' },
  { label: 'Kannada', value: 'kn' },
  { label: 'Kazakh', value: 'kk' },
  { label: 'Khmer', value: 'km' },
  { label: 'Korean', value: 'ko' },
  { label: 'Kurdish', value: 'ku' },
  { label: 'Kyrgyz', value: 'ky' },
  { label: 'Lao', value: 'lo' },
  { label: 'Latin', value: 'la' },
  { label: 'Latvian', value: 'lv' },
  { label: 'Lithuanian', value: 'lt' },
  { label: 'Luxembourgish', value: 'lb' },
  { label: 'Macedonian', value: 'mk' },
  { label: 'Malagasy', value: 'mg' },
  { label: 'Malay', value: 'ms' },
  { label: 'Malayalam', value: 'ml' },
  { label: 'Maltese', value: 'mt' },
  { label: 'Maori', value: 'mi' },
  { label: 'Marathi', value: 'mr' },
  { label: 'Mongolian', value: 'mn' },
  { label: 'Myanmar (Burmese)', value: 'my' },
  { label: 'Nepali', value: 'ne' },
  { label: 'Norwegian', value: 'no' },
  { label: 'Nyanja (Chichewa)', value: 'ny' },
  { label: 'Pashto', value: 'ps' },
  { label: 'Persian', value: 'fa' },
  { label: 'Polish', value: 'pl' },
  { label: 'Portuguese (Portugal, Brazil)', value: 'pt' },
  { label: 'Punjabi', value: 'pa' },
  { label: 'Romanian', value: 'ro' },
  { label: 'Russian', value: 'ru' },
  { label: 'Samoan', value: 'sm' },
  { label: 'Scots Gaelic', value: 'gd' },
  { label: 'Serbian', value: 'sr' },
  { label: 'Sesotho', value: 'st' },
  { label: 'Shona', value: 'sn' },
  { label: 'Sindhi', value: 'sd' },
  { label: 'Sinhala (Sinhalese)', value: 'si' },
  { label: 'Slovak', value: 'sk' },
  { label: 'Slovenian', value: 'sl' },
  { label: 'Somali', value: 'so' },
  { label: 'Spanish', value: 'es' },
  { label: 'Sundanese', value: 'su' },
  { label: 'Swahili', value: 'sw' },
  { label: 'Swedish', value: 'sv' },
  { label: 'Tagalog (Filipino)', value: 'tl' },
  { label: 'Tajik', value: 'tg' },
  { label: 'Tamil', value: 'ta' },
  { label: 'Telugu', value: 'te' },
  { label: 'Thai', value: 'th' },
  { label: 'Turkish', value: 'tr' },
  { label: 'Ukrainian', value: 'uk' },
  { label: 'Urdu', value: 'ur' },
  { label: 'Uzbek', value: 'uz' },
  { label: 'Vietnamese', value: 'vi' },
  { label: 'Welsh', value: 'cy' },
  { label: 'Xhosa', value: 'xh' },
  { label: 'Yiddish', value: 'yi' },
  { label: 'Yoruba', value: 'yo' },
  { label: 'Zulu', value: 'zu' },
]

export const TranslationSettings: Component = () => {
  const state = userStore()

  const [, setDirection] = createSignal(state.user?.translation?.direction || 'none')
  const [, setType] = createSignal(state.user?.translation?.type || 'googletranslate')
  const [, setTargetLanguage] = createSignal(state.user?.translation?.targetLanguage || 'en')

  const [tab, setTab] = createSignal(0)
  const tabs: Tab[] = ['googletranslate']
  const currentTab = createMemo(() => tabs[tab()])
  const subclass = 'flex flex-col gap-4'

  return (
    <>
      <div class="flex flex-col gap-4">
        <p class="text-lg font-bold">Chat translation</p>

        <p class="text-lg font-bold">Auto-mode</p>

        <Select
          fieldName="translationDirection"
          items={translationDirections}
          value={state.user?.translation?.direction || 'none'}
          onChange={(value) => setDirection(value.value as any)}
        />

        <p class="text-lg font-bold">Provider</p>

        <Select
          fieldName="translationType"
          items={translationTypes}
          value={state.user?.translation?.type || 'googletranslate'}
          onChange={(value) => setType(value.value as any)}
        />

        <p class="text-lg font-bold">Target language</p>

        <Select
          fieldName="translationLanguage"
          items={languageCodes}
          value={state.user?.translation?.targetLanguage || 'en'}
          onChange={(value) => setTargetLanguage(value.value as any)}
        />

        <Divider />

        <p class="text-lg font-bold">Translation Services</p>

        <div class="my-2">
          <Tabs tabs={tabs.map((t) => translateServiceTabs[t])} selected={tab} select={setTab} />
        </div>

        <div class="flex flex-col gap-4">
          <div class={currentTab() === 'googletranslate' ? subclass : 'hidden'}>
            <GoogleTranslateSettings />
          </div>
        </div>
      </div>
    </>
  )
}
