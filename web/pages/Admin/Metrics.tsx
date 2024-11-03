import { Component, createMemo, createSignal, For, onMount } from 'solid-js'
import Button from '../../shared/Button'
import { FormLabel } from '../../shared/FormLabel'
import PageHeader from '../../shared/PageHeader'
import { setComponentPageTitle } from '../../shared/util'
import { adminStore } from '../../store'
import { Card } from '/web/shared/Card'
import TextInput from '/web/shared/TextInput'
import { ConfirmModal } from '/web/shared/Modal'
import { Page } from '/web/Layout'
import { createStore } from 'solid-js/store'

const MetricsPage: Component = () => {
  let refForm: any

  setComponentPageTitle('Metrics')
  const admin = adminStore()
  const [refMsg, setRefMsg] = createSignal<any>()
  const [confirm, setConfirm] = createSignal(false)

  const [store, setStore] = createStore({ message: '', userLevel: -1 })

  onMount(() => adminStore.getMetrics())

  const sendAll = () => {
    const { message, userLevel } = store
    adminStore.sendAll(message, userLevel, () => {
      refMsg().value = ''
    })
  }

  const shas = createMemo(() => {
    return Object.entries(admin.metrics?.shas || {})
      .map(([sha, count]) => ({ sha, count }))
      .sort((l, r) => r.count - l.count)
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
          helperText={admin.metrics?.connected || '...'}
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
          helperText={admin.metrics?.maxLiveCount || '...'}
        />

        <FormLabel
          fieldName="totalUsers"
          label="Registered Users"
          helperText={admin.metrics?.totalUsers || '...'}
        />

        <FormLabel fieldName="services" label="Services" helperText={admin.metrics?.each.length} />

        <Card>
          <form ref={refForm} class="flex flex-col gap-1">
            <FormLabel label="Message All Users" />
            <TextInput
              ref={setRefMsg}
              isMultiline
              value={store.message}
              onChange={(ev) => setStore('message', ev.currentTarget.value)}
            />
            <TextInput
              type="number"
              value={store.userLevel}
              onChange={(ev) => setStore('userLevel', +ev.currentTarget.value)}
            />
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
