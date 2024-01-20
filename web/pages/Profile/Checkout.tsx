import { Component, onMount } from 'solid-js'
import PageHeader from '/web/shared/PageHeader'
import { Pill, SolidCard } from '/web/shared/Card'
import Button from '/web/shared/Button'
import { useSearchParams } from '@solidjs/router'
import { userStore } from '/web/store'
import { Trans, useTransContext } from '@mbarzda/solid-i18next'

export const CheckoutSuccess: Component = (props) => {
  const [t] = useTransContext()

  const [query] = useSearchParams()

  onMount(() => {
    userStore.finishCheckout(query.session_id, 'success', () => {
      window.close()
    })
  })

  return (
    <>
      <PageHeader title="Checkout Success" />
      <div class="flex flex-col items-center gap-4">
        <SolidCard class="flex flex-col items-center gap-4">
          <p class="font-bold">{t('thank_you_for_subscribing')}</p>

          <p>
            <Trans
              key="start_using_your_subscription_message"
              options={{ app_name: t('app_name') }}
            >
              Start using your subscription by creating and using an
              <Pill type="hl">{'{{ app_name }}'}</Pill> preset.
            </Trans>
          </p>
        </SolidCard>
        <Button onClick={() => window.close()}>{t('close_window')}</Button>
      </div>
    </>
  )
}

export const CheckoutCancel: Component = (props) => {
  const [t] = useTransContext()

  const [query] = useSearchParams()

  onMount(() => {
    userStore.finishCheckout(query.session_id, 'cancel')
  })

  return (
    <>
      <PageHeader title="Checkout Cancelled" />

      <div class="flex flex-col items-center gap-4">
        <SolidCard class="flex flex-col items-center gap-4" bg="orange-600">
          <p>{t('your_attempt_to_subscribe_was_cancelled')}</p>
        </SolidCard>
        <Button onClick={() => window.close()}>{t('close_window')}</Button>
      </div>
    </>
  )
}
