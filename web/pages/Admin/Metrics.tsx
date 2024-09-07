import { Component, createMemo, createSignal, For, onMount } from 'solid-js'
import Button from '../../shared/Button'
import { FormLabel } from '../../shared/FormLabel'
import PageHeader from '../../shared/PageHeader'
import { getStrictForm, setComponentPageTitle } from '../../shared/util'
import { adminStore } from '../../store'
import { Card } from '/web/shared/Card'
import TextInput from '/web/shared/TextInput'
import { ConfirmModal } from '/web/shared/Modal'
import { Page } from '/web/Layout'

const MetricsPage: Component = () => {
  let refForm: any

  setComponentPageTitle('Metrics')
  const state = adminStore()
  const [refMsg, setRefMsg] = createSignal<any>()
  const [confirm, setConfirm] = createSignal(false)

  onMount(() => adminStore.getMetrics())

  const sendAll = () => {
    const { message, userLevel } = getStrictForm(refForm, {
      message: 'string',
      userLevel: 'number',
    })
    adminStore.sendAll(message, userLevel, () => {
      refMsg().value = ''
    })
  }

  const shas = createMemo(() => {
    return Object.entries(state.metrics?.shas || {}).map(([sha, count]) => ({ sha, count }))
  })

  return (
    <Page>
      <PageHeader title="Metrics" />
      <div class="mb-4 flex gap-4">
        <Button onClick={adminStore.getMetrics}>Refresh</Button>
      </div>

      <div class="flex flex-col gap-2 text-xl">
        <FormLabel
          fieldName="active"
          label="Online Users"
          helperText={state.metrics?.connected || '...'}
        />

        <div class="flex flex-col gap-1">
          <div class="font-bold">Versions</div>

          <For each={shas()}>
            {(each) => (
              <div class="flex gap-1 text-sm">
                {each.sha}: {each.count}
              </div>
            )}
          </For>
        </div>

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
          <form ref={refForm} class="flex flex-col gap-1">
            <FormLabel label="Message All Users" />
            <TextInput ref={setRefMsg} fieldName="message" isMultiline />
            <TextInput type="number" fieldName="userLevel" value={-1} />
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
    </Page>
  )
}

export default MetricsPage
