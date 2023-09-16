import { A } from '@solidjs/router'
import { Component, createSignal, onMount } from 'solid-js'
import Button from '../../shared/Button'
import { FormLabel } from '../../shared/FormLabel'
import PageHeader from '../../shared/PageHeader'
import { getStrictForm, setComponentPageTitle } from '../../shared/util'
import { adminStore } from '../../store'
import { Card } from '/web/shared/Card'
import TextInput from '/web/shared/TextInput'
import { ConfirmModal } from '/web/shared/Modal'

const MetricsPage: Component = () => {
  let refForm: any

  setComponentPageTitle('Metrics')
  const state = adminStore()
  const [refMsg, setRefMsg] = createSignal<any>()
  const [confirm, setConfirm] = createSignal(false)

  onMount(() => adminStore.getMetrics())

  const sendAll = () => {
    const { message } = getStrictForm(refForm, { message: 'string' })
    adminStore.sendAll(message, () => {
      refMsg().value = ''
    })
  }

  return (
    <>
      <PageHeader title="Metrics" />
      <div class="mb-4 flex gap-4">
        <A href="/admin/subscriptions">
          <Button>Subscriptions</Button>
        </A>
        <A href="/admin/users">
          <Button>User Management</Button>
        </A>
        <Button onClick={adminStore.getMetrics}>Refresh</Button>
      </div>

      <div class="flex flex-col gap-2 text-xl">
        <FormLabel
          fieldName="active"
          label="Online Users"
          helperText={state.metrics?.connected || '...'}
        />

        <FormLabel
          fieldName="active"
          label="Max Online Users"
          helperText={state.metrics?.maxLiveCount || '...'}
        />

        <FormLabel
          fieldName="totalUsers"
          label="Registered Users"
          helperText={state.metrics?.totalUsers || '...'}
        />

        <FormLabel fieldName="services" label="Services" helperText={state.metrics?.each.length} />

        <Card>
          <form ref={refForm}>
            <FormLabel label="Message All Users" />
            <TextInput ref={setRefMsg} fieldName="message" isMultiline />
            <Button onClick={() => setConfirm(true)}>Send</Button>
          </form>
        </Card>
      </div>

      <ConfirmModal
        show={confirm()}
        close={() => setConfirm(false)}
        confirm={sendAll}
        message="Are you sure you wish to send a message to all users?"
      />
    </>
  )
}

export default MetricsPage
