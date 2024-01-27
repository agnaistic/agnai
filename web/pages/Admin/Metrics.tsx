import { Component, createSignal, onMount } from 'solid-js'
import Button from '../../shared/Button'
import { FormLabel } from '../../shared/FormLabel'
import PageHeader from '../../shared/PageHeader'
import { getStrictForm, setComponentPageTitle } from '../../shared/util'
import { adminStore } from '../../store'
import { Card } from '/web/shared/Card'
import TextInput from '/web/shared/TextInput'
import { ConfirmModal } from '/web/shared/Modal'
import { useTransContext } from '@mbarzda/solid-i18next'

const MetricsPage: Component = () => {
  const [t] = useTransContext()

  let refForm: any

  setComponentPageTitle(t('metrics'))
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
        <Button onClick={adminStore.getMetrics}>{t('refresh')}</Button>
      </div>

      <div class="flex flex-col gap-2 text-xl">
        <FormLabel
          fieldName="active"
          label={t('online_users')}
          helperText={state.metrics?.connected || '...'}
        />

        <FormLabel
          fieldName="active"
          label={t('max_online_users')}
          helperText={state.metrics?.maxLiveCount || '...'}
        />

        <FormLabel
          fieldName="totalUsers"
          label={t('registered_users')}
          helperText={state.metrics?.totalUsers || '...'}
        />

        <FormLabel
          fieldName="services"
          label={t('services')}
          helperText={state.metrics?.each.length}
        />

        <Card>
          <form ref={refForm}>
            <FormLabel label={t('message_all_users')} />
            <TextInput ref={setRefMsg} fieldName="message" isMultiline />
            <Button onClick={() => setConfirm(true)}>{t('send')}</Button>
          </form>
        </Card>
      </div>

      <ConfirmModal
        show={confirm()}
        close={() => setConfirm(false)}
        confirm={sendAll}
        message={t('are_you_sure_you_want_to_send_message_to_all_users?')}
      />
    </>
  )
}

export default MetricsPage
