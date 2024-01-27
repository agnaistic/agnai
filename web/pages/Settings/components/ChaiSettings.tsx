import { Component } from 'solid-js'
import { useTransContext } from '@mbarzda/solid-i18next'

const ChaiSettings: Component = () => {
  const [t] = useTransContext()

  return (
    <>
      <p>
        <i>{t('chai_settings_currently_unavailable')}</i>
      </p>
    </>
  )
}

export default ChaiSettings
