import { A } from '@solidjs/router'
import { Component, createEffect, createSignal, onMount } from 'solid-js'
import Button from '../../shared/Button'
import { FormLabel } from '../../shared/FormLabel'
import PageHeader from '../../shared/PageHeader'
import { adminStore } from '../../store'

const MetricsPage: Component = () => {
  const state = adminStore()
  const [timer, setTimer] = createSignal<any>()

  createEffect(() => {
    adminStore.getMetrics()
  })

  return (
    <>
      <PageHeader title="Metrics" />
      <div class="mb-4 flex gap-4">
        <A href="/admin/users">
          <Button>User Management</Button>
        </A>
        <Button onClick={adminStore.getMetrics}>Refresh</Button>
      </div>
      <div class="gal-4 flex flex-col text-xl">
        <FormLabel
          fieldName="active"
          label="Online Users"
          helperText={state.metrics?.connected || '...'}
        />

        <FormLabel
          fieldName="active"
          label="Registered Users"
          helperText={state.metrics?.totalUsers || '...'}
        />
      </div>
    </>
  )
}

export default MetricsPage
