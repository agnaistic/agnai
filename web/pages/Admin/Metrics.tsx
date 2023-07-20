import { A } from '@solidjs/router'
import { Component, createEffect } from 'solid-js'
import Button from '../../shared/Button'
import { FormLabel } from '../../shared/FormLabel'
import PageHeader from '../../shared/PageHeader'
import { setComponentPageTitle } from '../../shared/util'
import { adminStore } from '../../store'

const MetricsPage: Component = () => {
  setComponentPageTitle('Metrics')
  const state = adminStore()

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
          label="Max Online Users"
          helperText={state.metrics?.maxLiveCount || '...'}
        />

        <FormLabel
          fieldName="totalUsers"
          label="Registered Users"
          helperText={state.metrics?.totalUsers || '...'}
        />

        <FormLabel fieldName="services" label="Services" helperText={state.metrics?.each.length} />
      </div>
    </>
  )
}

export default MetricsPage
