import { Component } from 'solid-js'
import { useTransContext } from '@mbarzda/solid-i18next'

const NovelTtsSettings: Component = () => {
  const [t] = useTransContext()

  return (
    <>
      <div class="text-xl">{t('novel_ai_text_to_speech')}</div>

      <div class="italic">{t('you_can_configure_the_novel_ai_key_in_the_ai_settings')}</div>
    </>
  )
}

export default NovelTtsSettings
