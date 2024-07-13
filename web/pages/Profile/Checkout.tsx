import { Component, onMount } from 'solid-js'
import PageHeader from '/web/shared/PageHeader'
import { Pill, SolidCard } from '/web/shared/Card'
import Button from '/web/shared/Button'
import { useSearchParams } from '@solidjs/router'
import { userStore } from '/web/store'
import { Page } from '/web/Layout'

export const CheckoutSuccess: Component = (props) => {
  const [query] = useSearchParams()

  onMount(() => {
    userStore.finishCheckout(query.session_id!, 'success', () => {
      window.close()
    })
  })

  return (
    <Page>
      <PageHeader title="Checkout Success" />
      <div class="flex flex-col items-center gap-4">
        <SolidCard class="flex flex-col items-center gap-4">
          <p class="font-bold">Thank you for subscribing!</p>

          <p>
            Start using your subscription by creating and using an <Pill type="hl">Agnaistic</Pill>{' '}
            preset.
          </p>
        </SolidCard>
        <Button onClick={() => window.close()}>Close Window</Button>
      </div>
    </Page>
  )
}

export const CheckoutCancel: Component = (props) => {
  const [query] = useSearchParams()

  onMount(() => {
    userStore.finishCheckout(query.session_id!, 'cancel')
  })

  return (
    <Page>
      <PageHeader title="Checkout Cancelled" />

      <div class="flex flex-col items-center gap-4">
        <SolidCard class="flex flex-col items-center gap-4" bg="orange-600">
          <p>Your attempt to subscribe was cancelled. You have not been charged.</p>
        </SolidCard>
        <Button onClick={() => window.close()}>Close Window</Button>
      </div>
    </Page>
  )
}
